"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 브라우저에서 사용하는 Supabase 클라이언트.
 * 환경 변수에서 URL/anon key를 읽어 단 1회만 만든다.
 *
 * 운영/배포 환경의 환경 변수는 Vercel 대시보드에 등록되어 있어야 한다.
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * 환경 변수가 비어 있는 경우(예: 로컬 .env.local 미설정)에는 null을 반환한다.
 * 호출 측에서 null 여부로 안내 화면을 띄울 수 있다.
 */

let cachedClient: SupabaseClient | null | undefined;
let recoveryStarted = false;
let rejectionHandlerAttached = false;

const AUTH_BROKEN_FLAG = "digital-pop:supabase-auth-needs-reset";

/**
 * Next.js는 NEXT_PUBLIC_* 환경 변수를 빌드 시 **정확한 이름으로 직접 접근**한 곳에만 값을 끼워 넣는다.
 * 동적으로 process.env[변수]처럼 접근하면 브라우저에서는 undefined가 되어버린다.
 * 그래서 아래는 반드시 "리터럴 키"로 적어 두어야 한다.
 */
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

function isAuthRecoveryError(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes("refresh token") ||
    msg.includes("invalid jwt") ||
    msg.includes("session from session_id claim in jwt does not exist") ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("fetch failed") ||
    msg.includes("network request failed") ||
    msg.includes("load failed")
  );
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message ?? "");
  }
  return String(err ?? "");
}

/** localStorage 에 남은 sb-*-auth-token 을 제거한다. */
export function clearSupabaseAuthStorage(): void {
  if (typeof window === "undefined") return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    if (key.startsWith("sb-") && key.includes("auth-token")) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
}

function markAuthNeedsReset(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_BROKEN_FLAG, "1");
  clearSupabaseAuthStorage();
}

function clearAuthNeedsResetFlag(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_BROKEN_FLAG);
}

async function purgeLocalAuth(client: SupabaseClient): Promise<void> {
  try {
    client.auth.stopAutoRefresh();
  } catch {
    // ignore
  }
  await client.auth.signOut({ scope: "local" }).catch(() => {});
  markAuthNeedsReset();
}

/**
 * 프로젝트 pause/resume·네트워크 단절 등으로 세션 복구가 실패하면
 * 로컬 세션만 정리해 로그인 화면으로 돌아갈 수 있게 한다.
 */
export async function recoverInvalidSupabaseSession(
  client: SupabaseClient,
): Promise<boolean> {
  try {
    const { data, error } = await client.auth.getSession();
    if (error && isAuthRecoveryError(error.message ?? "")) {
      await purgeLocalAuth(client);
      return true;
    }
    if (!data.session) {
      clearAuthNeedsResetFlag();
      return false;
    }

    const { error: userError } = await client.auth.getUser();
    if (userError && isAuthRecoveryError(userError.message ?? "")) {
      await purgeLocalAuth(client);
      return true;
    }
    if (userError) {
      await purgeLocalAuth(client);
      return true;
    }

    clearAuthNeedsResetFlag();
    try {
      client.auth.startAutoRefresh();
    } catch {
      // ignore
    }
    return false;
  } catch (err) {
    if (isAuthRecoveryError(errorMessage(err))) {
      await purgeLocalAuth(client);
      return true;
    }
    await purgeLocalAuth(client);
    return true;
  }
}

function attachAuthRejectionHandler(client: SupabaseClient): void {
  if (typeof window === "undefined" || rejectionHandlerAttached) return;
  rejectionHandlerAttached = true;

  window.addEventListener("unhandledrejection", (event) => {
    const message = errorMessage(event.reason);
    if (!isAuthRecoveryError(message)) return;

    // refresh token / Failed to fetch 가 Next.js 오버레이로 반복 노출되는 것 완화
    event.preventDefault();
    void purgeLocalAuth(client);
  });
}

function startAuthRecovery(client: SupabaseClient): void {
  if (typeof window === "undefined" || recoveryStarted) return;
  recoveryStarted = true;
  attachAuthRejectionHandler(client);
  void recoverInvalidSupabaseSession(client);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    cachedClient = null;
    return cachedClient;
  }

  // 직전 로드에서 refresh 실패가 있었다면, createClient 초기화 전에 토큰을 비운다.
  // (그렇지 않으면 _recoverAndRefresh 가 Failed to fetch 를 콘솔에 남긴다.)
  if (typeof window !== "undefined" && window.localStorage.getItem(AUTH_BROKEN_FLAG)) {
    clearSupabaseAuthStorage();
    window.localStorage.removeItem(AUTH_BROKEN_FLAG);
  }

  cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      // 세션 검증 성공 후에만 startAutoRefresh() 호출
      autoRefreshToken: false,
      detectSessionInUrl: true,
    },
  });
  startAuthRecovery(cachedClient);
  return cachedClient;
}

/** 로그인 성공 후 세션 자동 갱신을 켠다. */
export function enableSupabaseAuthAutoRefresh(client: SupabaseClient): void {
  clearAuthNeedsResetFlag();
  try {
    client.auth.startAutoRefresh();
  } catch {
    // ignore
  }
}

/** 환경 변수가 모두 채워져 있어 Supabase가 사용 가능한지 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
