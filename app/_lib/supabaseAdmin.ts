"use client";

import { getSupabaseClient } from "./supabase";

export type AdminProfileStatus = "PENDING" | "ACTIVE" | "REJECTED" | "LOCKED";
export type AdminProfileRole = "master" | "store";

/** admin_profiles 1행 (Supabase 컬럼명 그대로) */
export type AdminProfileRow = {
  id: string;
  role: AdminProfileRole;
  username: string;
  name: string | null;
  phone: string | null;
  team: string | null;
  is_super: boolean;
  store_id: string | null;
  status: AdminProfileStatus;
  rejected_reason: string | null;
  created_at: string;
};

/** stores 1행 */
export type StoreRow = {
  id: string;
  code: string;
  name: string;
};

/** 사용자가 입력한 username을 Supabase Auth용 이메일로 매핑 */
export const SUPABASE_EMAIL_DOMAIN = "digital-pop.local";
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${SUPABASE_EMAIL_DOMAIN}`;
}

/** 매장 전체 목록 */
export async function fetchStores(): Promise<StoreRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("stores")
    .select("id, code, name")
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data as StoreRow[];
}

export type StoreMutationResult =
  | { ok: true }
  | { ok: false; reason: "DUPLICATE_CODE" | "UNKNOWN"; message: string };

/** 매장 등록 */
export async function createStore(params: {
  id: string;
  code: string;
  name: string;
}): Promise<StoreMutationResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, reason: "UNKNOWN", message: "매장 데이터에 연결할 수 없습니다." };
  }
  const id = params.id.trim();
  const code = params.code.trim().toUpperCase();
  const name = params.name.trim();
  if (!id || !code || !name) {
    return { ok: false, reason: "UNKNOWN", message: "매장 ID·코드·이름을 모두 입력해 주세요." };
  }
  const { error } = await client.from("stores").insert({ id, code, name });
  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return {
        ok: false,
        reason: "DUPLICATE_CODE",
        message: "이미 사용 중인 매장 ID 또는 코드입니다.",
      };
    }
    return {
      ok: false,
      reason: "UNKNOWN",
      message: `매장 등록 중 오류가 발생했습니다. (${error.message})`,
    };
  }
  return { ok: true };
}

/** 매장 수정 (이름만 변경 가능. id·code 는 한 번 정해지면 고정) */
export async function updateStoreName(id: string, name: string): Promise<StoreMutationResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, reason: "UNKNOWN", message: "매장 데이터에 연결할 수 없습니다." };
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, reason: "UNKNOWN", message: "매장명을 입력해 주세요." };
  }
  const { error } = await client.from("stores").update({ name: trimmed }).eq("id", id);
  if (error) {
    return {
      ok: false,
      reason: "UNKNOWN",
      message: `매장 수정 중 오류가 발생했습니다. (${error.message})`,
    };
  }
  return { ok: true };
}

/** 매장 삭제 (현 단계에서는 사용 안 함, 필요 시 호출) */
export async function deleteStore(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  const { error } = await client.from("stores").delete().eq("id", id);
  return !error;
}

/** 특정 role의 admin_profiles 전체 */
export async function fetchAdminProfilesByRole(
  role: AdminProfileRole,
): Promise<AdminProfileRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("admin_profiles")
    .select(
      "id, role, username, name, phone, team, is_super, store_id, status, rejected_reason, created_at",
    )
    .eq("role", role)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as AdminProfileRow[];
}

/** status 변경 (공통) */
async function updateAdminProfileStatus(
  id: string,
  status: AdminProfileStatus,
  rejectedReason: string | null = null,
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  const patch: Record<string, unknown> = { status };
  if (status === "REJECTED") {
    patch.rejected_reason = rejectedReason ?? null;
  } else {
    patch.rejected_reason = null;
  }
  const { error } = await client.from("admin_profiles").update(patch).eq("id", id);
  return !error;
}

export async function approveAdminProfile(id: string): Promise<boolean> {
  return updateAdminProfileStatus(id, "ACTIVE");
}

export async function rejectAdminProfile(
  id: string,
  reason: string | null,
): Promise<boolean> {
  return updateAdminProfileStatus(id, "REJECTED", reason);
}

export async function unlockAdminProfile(id: string): Promise<boolean> {
  return updateAdminProfileStatus(id, "ACTIVE");
}

export async function lockAdminProfile(id: string): Promise<boolean> {
  return updateAdminProfileStatus(id, "LOCKED");
}

export async function setAdminProfileSuper(
  id: string,
  isSuper: boolean,
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  const { error } = await client
    .from("admin_profiles")
    .update({ is_super: isSuper })
    .eq("id", id);
  return !error;
}

/**
 * admin_profiles 행을 삭제합니다.
 * auth.users 의 실제 계정 삭제는 service_role 키가 필요해 클라이언트에서 직접 못 합니다.
 * 운영 단계에서는 admin_profiles 만 지우고, 동일 username 재가입은 막힙니다 (auth.users.email unique 충돌).
 * 따라서 운영 절차상으로는 "삭제 = 잠금/거절"을 권장합니다.
 */
export async function deleteAdminProfile(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  const { error } = await client.from("admin_profiles").delete().eq("id", id);
  return !error;
}

/**
 * 회원가입(신청). Supabase Auth signUp 후 자동 발급된 세션을 즉시 종료하여
 * 승인 전 자동 로그인되지 않도록 합니다.
 *
 * 트리거(handle_new_admin_user)가 admin_profiles 행을 PENDING 상태로 자동 생성합니다.
 */
export async function signUpAdminApplicant(params: {
  username: string;
  password: string;
  role: AdminProfileRole;
  name: string;
  phone: string;
  team?: string | null;
  storeId?: string | null;
}): Promise<{ ok: true } | { ok: false; reason: "DUPLICATE" | "UNKNOWN"; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, reason: "UNKNOWN", message: "로그인 서비스에 연결할 수 없습니다." };
  }
  const email = usernameToEmail(params.username);
  const { data, error } = await client.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        username: params.username.trim(),
        role: params.role,
        name: params.name.trim(),
        phone: params.phone.trim(),
        team: params.team?.trim() ?? null,
        store_id: params.storeId ?? null,
      },
    },
  });
  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return { ok: false, reason: "DUPLICATE", message: "이미 사용 중인 아이디입니다." };
    }
    return {
      ok: false,
      reason: "UNKNOWN",
      message: `신청 처리 중 오류가 발생했습니다. (${error.message})`,
    };
  }
  if (!data.user) {
    return {
      ok: false,
      reason: "UNKNOWN",
      message: "신청 처리 중 오류가 발생했습니다. (사용자 정보 없음)",
    };
  }
  // signUp 직후 자동 로그인 방지
  await client.auth.signOut();
  return { ok: true };
}
