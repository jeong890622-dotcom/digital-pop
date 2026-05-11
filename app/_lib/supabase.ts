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

function readPublicEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const url = readPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, anonKey, {
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
  return Boolean(
    readPublicEnv("NEXT_PUBLIC_SUPABASE_URL") &&
      readPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
