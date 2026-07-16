import type { ZoneQrEntry } from "./storeZoneQrStore";

/** Windows 파일명에 쓸 수 없는 문자를 _ 로 치환 */
export function sanitizeDownloadFilename(name: string): string {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

export function qrImageSourceUrl(
  entry: Pick<ZoneQrEntry, "qrUrl" | "qrImageUrl">,
  format: "png" | "svg",
): string {
  if (format === "svg") {
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&format=svg&data=${encodeURIComponent(
      entry.qrUrl,
    )}`;
  }
  return entry.qrImageUrl;
}

function needsUtf8Filename(name: string): boolean {
  return /[^\x00-\x7F]/.test(name);
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data[i]!;
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  return b;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  b[2] = (n >>> 16) & 0xff;
  b[3] = (n >>> 24) & 0xff;
  return b;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function isValidImageBuffer(buffer: Uint8Array, format: "png" | "svg"): boolean {
  if (buffer.length < 8) return false;
  if (format === "png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  const head = new TextDecoder().decode(buffer.slice(0, Math.min(buffer.length, 256))).trim();
  return head.includes("<svg") || head.startsWith("<?xml");
}

/** STORE(무압축) ZIP. 한글 파일명은 UTF-8 플래그(0x0800)를 설정한다. */
export function buildStoreZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const gpFlags = needsUtf8Filename(file.name) ? 0x0800 : 0;
    const checksum = crc32(file.data);
    const localHeader = concatBytes([
      u32(0x04034b50),
      u16(20),
      u16(gpFlags),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(file.data.length),
      u32(file.data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
    ]);
    localParts.push(localHeader, file.data);

    const centralHeader = concatBytes([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(gpFlags),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(file.data.length),
      u32(file.data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + file.data.length;
  }

  const centralDir = concatBytes(centralParts);
  const end = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);

  return concatBytes([...localParts, centralDir, end]);
}

export type QrZipEntryInput = {
  zone: string;
  zoneId: string;
  qrUrl: string;
  qrImageUrl: string;
};

export type QrZipBuildResult =
  | {
      ok: true;
      zipBytes: Uint8Array;
      zipFilename: string;
      includedCount: number;
      skippedZones: string[];
    }
  | {
      ok: false;
      message: string;
      skippedZones: string[];
    };

export async function buildStoreQrZipBytes(params: {
  storeName: string;
  format: "png" | "svg";
  entries: QrZipEntryInput[];
}): Promise<QrZipBuildResult> {
  const storeLabel = sanitizeDownloadFilename(params.storeName || "매장");
  const formatUpper = params.format.toUpperCase();
  const zipFilename = `${storeLabel}_QR코드_${formatUpper}.zip`;

  if (params.entries.length === 0) {
    return {
      ok: false,
      message: "다운로드할 QR이 없습니다. 먼저 ZONE별 QR을 생성해 주세요.",
      skippedZones: [],
    };
  }

  const zipFiles: { name: string; data: Uint8Array }[] = [];
  const failures: string[] = [];

  for (const entry of params.entries) {
    try {
      const sourceUrl = qrImageSourceUrl(entry, params.format);
      const response = await fetch(sourceUrl, {
        headers: { Accept: params.format === "svg" ? "image/svg+xml,*/*" : "image/png,*/*" },
        cache: "no-store",
      });
      if (!response.ok) {
        failures.push(entry.zone);
        continue;
      }
      const buffer = new Uint8Array(await response.arrayBuffer());
      if (!isValidImageBuffer(buffer, params.format)) {
        failures.push(entry.zone);
        continue;
      }
      const zoneLabel = sanitizeDownloadFilename(entry.zone || entry.zoneId);
      zipFiles.push({
        name: `${storeLabel}_${zoneLabel}.${params.format}`,
        data: buffer,
      });
      // 외부 QR API 연속 호출 제한 완화
      await new Promise((resolve) => setTimeout(resolve, 120));
    } catch {
      failures.push(entry.zone);
    }
  }

  if (zipFiles.length === 0) {
    return {
      ok: false,
      message: "QR 이미지를 가져오지 못했습니다. 네트워크를 확인하거나 잠시 후 다시 시도해 주세요.",
      skippedZones: failures,
    };
  }

  return {
    ok: true,
    zipBytes: buildStoreZip(zipFiles),
    zipFilename,
    includedCount: zipFiles.length,
    skippedZones: failures,
  };
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export type QrZipDownloadResult =
  | {
      ok: true;
      includedCount: number;
      skippedZones: string[];
      zipFilename: string;
    }
  | {
      ok: false;
      message: string;
      skippedZones: string[];
    };

/**
 * 현재 매장에서 QR이 생성된 ZONE만 모아 PNG 또는 SVG ZIP으로 다운로드한다.
 * 서버 API에서 이미지를 받아 ZIP을 만들어 브라우저 CORS·한글 파일명 문제를 피한다.
 */
export async function downloadStoreQrZip(params: {
  storeName: string;
  format: "png" | "svg";
  registeredZones: string[];
  entriesByZoneId: Record<string, ZoneQrEntry | undefined>;
  zoneIdFromLabel: (zone: string) => string;
  accessToken: string | null;
}): Promise<QrZipDownloadResult> {
  const entries: QrZipEntryInput[] = [];
  const skippedZones: string[] = [];

  for (const zone of params.registeredZones) {
    const zoneId = params.zoneIdFromLabel(zone);
    const entry = params.entriesByZoneId[zoneId];
    if (entry) {
      entries.push({
        zone: entry.zone,
        zoneId: entry.zoneId,
        qrUrl: entry.qrUrl,
        qrImageUrl: entry.qrImageUrl,
      });
    } else {
      skippedZones.push(zone);
    }
  }

  if (!params.accessToken) {
    return {
      ok: false,
      message: "로그인이 필요합니다. 다시 로그인한 뒤 시도해 주세요.",
      skippedZones,
    };
  }

  try {
    const res = await fetch("/api/admin/qr-zip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({
        storeName: params.storeName,
        format: params.format,
        entries,
      }),
    });

    if (!res.ok) {
      let message = "QR ZIP 다운로드에 실패했습니다.";
      try {
        const body = (await res.json()) as { message?: string };
        if (body.message) message = body.message;
      } catch {
        // ignore
      }
      return { ok: false, message, skippedZones };
    }

    const skippedHeader = res.headers.get("X-Skipped-Zones");
    const skippedFromServer = skippedHeader
      ? decodeURIComponent(skippedHeader)
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const includedHeader = res.headers.get("X-Included-Count");
    const includedCount = includedHeader ? Number.parseInt(includedHeader, 10) : entries.length;
    const zipFilenameHeader = res.headers.get("X-Zip-Filename");
    const zipFilename = zipFilenameHeader
      ? decodeURIComponent(zipFilenameHeader)
      : (res.headers
          .get("Content-Disposition")
          ?.match(/filename\*=UTF-8''([^";]+)/i)?.[1]
          ? decodeURIComponent(
              res.headers.get("Content-Disposition")!.match(/filename\*=UTF-8''([^";]+)/i)![1]!,
            )
          : `${sanitizeDownloadFilename(params.storeName)}_QR코드_${params.format.toUpperCase()}.zip`);

    const blob = await res.blob();
    if (blob.size < 32) {
      return {
        ok: false,
        message: "ZIP 파일이 비어 있습니다. QR 생성 여부를 확인해 주세요.",
        skippedZones: [...skippedZones, ...skippedFromServer],
      };
    }

    triggerBlobDownload(blob, zipFilename);

    return {
      ok: true,
      includedCount: Number.isFinite(includedCount) ? includedCount : entries.length,
      skippedZones: [...skippedZones, ...skippedFromServer],
      zipFilename,
    };
  } catch {
    return {
      ok: false,
      message: "QR ZIP 다운로드 중 네트워크 오류가 발생했습니다.",
      skippedZones,
    };
  }
}
