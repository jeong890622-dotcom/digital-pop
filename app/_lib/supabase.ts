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

/**
 * Next.js는 NEXT_PUBLIC_* 환경 변수를 빌드 시 **정확한 이름으로 직접 접근**한 곳에만 값을 끼워 넣는다.
 * 동적으로 process.env[변수]처럼 접근하면 브라우저에서는 undefined가 되어버린다.
 * 그래서 아래는 반드시 "리터럴 키"로 적어 두어야 한다.
 */
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cachedClient;
}

/** 환경 변수가 모두 채워져 있어 Supabase가 사용 가능한지 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
