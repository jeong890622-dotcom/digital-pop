import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { buildStoreQrZipBytes, type QrZipEntryInput } from "../../../_lib/downloadStoreQrZip";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

type AdminProfileAuthRow = {
  role: "master" | "store";
  status: string;
};

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
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

  let storeName = "";
  let format: "png" | "svg" = "png";
  let entries: QrZipEntryInput[] = [];

  try {
    const body = (await request.json()) as {
      storeName?: unknown;
      format?: unknown;
      entries?: unknown;
    };
    storeName = typeof body.storeName === "string" ? body.storeName.trim() : "";
    format = body.format === "svg" ? "svg" : "png";
    if (Array.isArray(body.entries)) {
      entries = body.entries
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const zone = typeof row.zone === "string" ? row.zone.trim() : "";
          const zoneId = typeof row.zoneId === "string" ? row.zoneId.trim() : "";
          const qrUrl = typeof row.qrUrl === "string" ? row.qrUrl.trim() : "";
          const qrImageUrl = typeof row.qrImageUrl === "string" ? row.qrImageUrl.trim() : "";
          if (!zone || !qrUrl || !qrImageUrl) return null;
          return { zone, zoneId, qrUrl, qrImageUrl };
        })
        .filter((item): item is QrZipEntryInput => item !== null);
    }
  } catch {
    return NextResponse.json({ ok: false, message: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (!storeName || entries.length === 0) {
    return NextResponse.json(
      { ok: false, message: "다운로드할 QR 정보가 없습니다." },
      { status: 400 },
    );
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

  const { data: profile, error: profileError } = await userClient
    .from("admin_profiles")
    .select("role, status")
    .eq("id", callerId)
    .single<AdminProfileAuthRow>();

  if (profileError || !profile || profile.status !== "ACTIVE") {
    return NextResponse.json(
      { ok: false, message: "관리자 권한이 없거나 승인되지 않은 계정입니다." },
      { status: 403 },
    );
  }

  const result = await buildStoreQrZipBytes({ storeName, format, entries });
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }

  const encodedFilename = encodeURIComponent(result.zipFilename);
  const asciiFilename = result.zipFilename.replace(/[^\x20-\x7E]/g, "_").replace(/_+/g, "_") || "QR.zip";

  return new NextResponse(Buffer.from(result.zipBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
      "X-Included-Count": String(result.includedCount),
      "X-Skipped-Zones": encodeURIComponent(result.skippedZones.join("|")),
      "X-Zip-Filename": encodedFilename,
      "Cache-Control": "no-store",
    },
  });
}
