import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { toResetPassword } from "../../../_lib/adminPassword";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

type AdminProfileAuthRow = {
  role: "master" | "store";
  is_super: boolean;
  status: string;
  phone: string | null;
};

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, message: "서버 인증 설정이 완료되지 않았습니다." },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return NextResponse.json({ ok: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  let targetUserId = "";
  try {
    const body = (await request.json()) as { targetUserId?: unknown };
    targetUserId = typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";
  } catch {
    return NextResponse.json({ ok: false, message: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (!targetUserId) {
    return NextResponse.json({ ok: false, message: "대상 계정이 지정되지 않았습니다." }, { status: 400 });
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const callerId = userData.user?.id;
  if (userError || !callerId) {
    return NextResponse.json({ ok: false, message: "세션이 유효하지 않습니다." }, { status: 401 });
  }

  if (callerId === targetUserId) {
    return NextResponse.json(
      { ok: false, message: "본인 계정 비밀번호는 이 화면에서 초기화할 수 없습니다." },
      { status: 403 },
    );
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from("admin_profiles")
    .select("role, is_super, status")
    .eq("id", callerId)
    .single<Pick<AdminProfileAuthRow, "role" | "is_super" | "status">>();

  if (
    callerProfileError ||
    !callerProfile ||
    callerProfile.role !== "master" ||
    callerProfile.status !== "ACTIVE"
  ) {
    return NextResponse.json(
      { ok: false, message: "마스터 관리자만 비밀번호를 초기화할 수 있습니다." },
      { status: 403 },
    );
  }

  const { data: targetProfile, error: targetProfileError } = await adminClient
    .from("admin_profiles")
    .select("role, phone")
    .eq("id", targetUserId)
    .single<Pick<AdminProfileAuthRow, "role" | "phone">>();

  if (targetProfileError || !targetProfile) {
    return NextResponse.json(
      { ok: false, message: "대상 계정을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (targetProfile.role === "master") {
    if (!callerProfile.is_super) {
      return NextResponse.json(
        { ok: false, message: "총괄 마스터 관리자만 마스터 계정 비밀번호를 초기화할 수 있습니다." },
        { status: 403 },
      );
    }
  } else if (targetProfile.role === "store") {
    if (callerProfile.role !== "master") {
      return NextResponse.json(
        { ok: false, message: "마스터 관리자만 매장 관리자 계정 비밀번호를 초기화할 수 있습니다." },
        { status: 403 },
      );
    }
  } else {
    return NextResponse.json(
      { ok: false, message: "지원하지 않는 계정 유형입니다." },
      { status: 400 },
    );
  }

  const phone = targetProfile.phone?.trim() ?? "";
  if (!phone) {
    return NextResponse.json(
      { ok: false, message: "핸드폰 번호가 등록된 계정만 초기화할 수 있습니다." },
      { status: 400 },
    );
  }

  const password = toResetPassword(phone);
  const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    password,
  });
  if (updateError) {
    return NextResponse.json(
      { ok: false, message: `비밀번호 초기화에 실패했습니다. (${updateError.message})` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
