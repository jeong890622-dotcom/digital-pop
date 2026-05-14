"use client";

import type { StoreOperationRow, StoreOperationRowsByStore } from "./storeOperationStore";
import { getSupabaseClient } from "./supabase";

const FETCH_PAGE_SIZE = 1000;
const WRITE_BATCH_SIZE = 500;

/* =========================================================================
 * 1. store_zone_merchandising (매장별 진열)
 * =======================================================================*/

export type StoreZoneMerchandisingDbRow = {
  id: string;
  store_id: string;
  zone: string;
  product_code: string;
  color_code: string;
  /** DB에 `sort_order` 컬럼이 없을 때(구 스키마) 조회 결과에 없을 수 있음 */
  sort_order?: number | null;
};

function buildMerchandisingId(row: {
  storeId: string;
  zone: string;
  productCode: string;
  colorCode: string;
}): string {
  return `${row.storeId}|${row.zone}|${row.productCode}|${row.colorCode}`;
}

function merchandisingFromDb(row: StoreZoneMerchandisingDbRow): StoreOperationRow {
  const so = row.sort_order;
  return {
    storeId: row.store_id ?? "",
    zone: row.zone ?? "",
    productCode: row.product_code ?? "",
    colorCode: row.color_code ?? "",
    sortOrder:
      typeof so === "number" && Number.isFinite(so) ? so : null,
  };
}

function merchandisingToDb(row: StoreOperationRow): StoreZoneMerchandisingDbRow {
  return {
    id: buildMerchandisingId(row),
    store_id: (row.storeId ?? "").trim(),
    zone: (row.zone ?? "").trim(),
    product_code: (row.productCode ?? "").trim(),
    color_code: (row.colorCode ?? "").trim(),
    sort_order:
      typeof row.sortOrder === "number" && Number.isFinite(row.sortOrder) ? row.sortOrder : null,
  };
}

async function fetchMerchandisingRowsPaged(
  includeSortOrder: boolean,
): Promise<{ rows: StoreZoneMerchandisingDbRow[]; requestFailed: boolean }> {
  const client = getSupabaseClient();
  const collected: StoreZoneMerchandisingDbRow[] = [];
  if (!client) {
    return { rows: [], requestFailed: false };
  }
  let from = 0;
  while (true) {
    const to = from + FETCH_PAGE_SIZE - 1;
    const base = includeSortOrder
      ? client
          .from("store_zone_merchandising")
          .select("id, store_id, zone, product_code, color_code, sort_order")
      : client
          .from("store_zone_merchandising")
          .select("id, store_id, zone, product_code, color_code");
    const { data, error } = await base
      .order("store_id", { ascending: true })
      .order("zone", { ascending: true })
      .order("product_code", { ascending: true })
      .order("color_code", { ascending: true })
      .range(from, to);
    if (error) {
      return { rows: collected, requestFailed: true };
    }
    if (!data) {
      return { rows: collected, requestFailed: true };
    }
    for (const row of data as StoreZoneMerchandisingDbRow[]) {
      collected.push(row);
    }
    if (data.length < FETCH_PAGE_SIZE) break;
    from += FETCH_PAGE_SIZE;
  }
  return { rows: collected, requestFailed: false };
}

export async function fetchAllStoreMerchandising(): Promise<StoreOperationRowsByStore> {
  const client = getSupabaseClient();
  const empty: StoreOperationRowsByStore = {};
  if (!client) return empty;
  const primary = await fetchMerchandisingRowsPaged(true);
  let collected: StoreZoneMerchandisingDbRow[] = primary.rows;
  if (primary.requestFailed) {
    const legacy = await fetchMerchandisingRowsPaged(false);
    collected = legacy.requestFailed ? [] : legacy.rows;
  }
  const byStore: StoreOperationRowsByStore = {};
  for (const row of collected) {
    const next = merchandisingFromDb(row);
    if (!next.storeId || !next.zone || !next.productCode || !next.colorCode) continue;
    const list = byStore[next.storeId] ?? (byStore[next.storeId] = []);
    list.push(next);
  }
  return byStore;
}

export async function replaceAllStoreMerchandising(
  nextRowsByStore: StoreOperationRowsByStore,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: "Supabase 클라이언트에 연결할 수 없습니다." };
  }
  const dbRows: StoreZoneMerchandisingDbRow[] = [];
  const seen = new Set<string>();
  for (const [storeId, rows] of Object.entries(nextRowsByStore)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const dbRow = merchandisingToDb({ ...row, storeId: row.storeId || storeId });
      if (
        !dbRow.store_id ||
        !dbRow.zone ||
        !dbRow.product_code ||
        !dbRow.color_code
      ) {
        continue;
      }
      if (seen.has(dbRow.id)) continue;
      seen.add(dbRow.id);
      dbRows.push(dbRow);
    }
  }

  for (let i = 0; i < dbRows.length; i += WRITE_BATCH_SIZE) {
    const batch = dbRows.slice(i, i + WRITE_BATCH_SIZE);
    const { error } = await client
      .from("store_zone_merchandising")
      .upsert(batch, { onConflict: "id" });
    if (error) {
      return {
        ok: false,
        message: `매장 진열 저장 중 오류가 발생했습니다. (${error.message})`,
      };
    }
  }

  const { data: existingIds, error: idsErr } = await client
    .from("store_zone_merchandising")
    .select("id");
  if (idsErr || !existingIds) {
    return {
      ok: false,
      message: `기존 매장 진열 ID 조회 중 오류가 발생했습니다. (${idsErr?.message ?? ""})`,
    };
  }
  const toDelete: string[] = [];
  for (const row of existingIds as Array<{ id: string }>) {
    if (!seen.has(row.id)) toDelete.push(row.id);
  }
  for (let i = 0; i < toDelete.length; i += WRITE_BATCH_SIZE) {
    const batch = toDelete.slice(i, i + WRITE_BATCH_SIZE);
    const { error } = await client
      .from("store_zone_merchandising")
      .delete()
      .in("id", batch);
    if (error) {
      return {
        ok: false,
        message: `이전 매장 진열 삭제 중 오류가 발생했습니다. (${error.message})`,
      };
    }
  }
  return { ok: true };
}

/* =========================================================================
 * 2. store_zone_qrs (매장별 존 QR)
 * =======================================================================*/

export type ZoneQrEntry = {
  storeId: string;
  zone: string;
  zoneId: string;
  qrId: string;
  qrUrl: string;
  qrImageUrl: string;
  generatedAt: string;
  qrUrlHistory?: string[];
};

export type ZoneQrByStore = Record<string, Record<string, ZoneQrEntry>>;

export type StoreZoneQrDbRow = {
  id: string;
  store_id: string;
  zone: string;
  zone_id: string;
  qr_id: string;
  qr_url: string;
  qr_image_url: string;
  qr_url_history: string[] | null;
  generated_at: string | null;
};

function buildZoneQrId(storeId: string, zoneId: string): string {
  return `${storeId}|${zoneId}`;
}

function zoneQrFromDb(row: StoreZoneQrDbRow): ZoneQrEntry {
  return {
    storeId: row.store_id ?? "",
    zone: row.zone ?? "",
    zoneId: row.zone_id ?? "",
    qrId: row.qr_id ?? "",
    qrUrl: row.qr_url ?? "",
    qrImageUrl: row.qr_image_url ?? "",
    generatedAt: row.generated_at ?? new Date().toISOString(),
    qrUrlHistory: Array.isArray(row.qr_url_history)
      ? row.qr_url_history.filter((v): v is string => typeof v === "string" && v.trim() !== "")
      : [],
  };
}

function zoneQrToDb(entry: ZoneQrEntry): StoreZoneQrDbRow {
  return {
    id: buildZoneQrId(entry.storeId, entry.zoneId),
    store_id: (entry.storeId ?? "").trim(),
    zone: (entry.zone ?? "").trim(),
    zone_id: (entry.zoneId ?? "").trim(),
    qr_id: (entry.qrId ?? "").trim(),
    qr_url: (entry.qrUrl ?? "").trim(),
    qr_image_url: (entry.qrImageUrl ?? "").trim(),
    qr_url_history: Array.isArray(entry.qrUrlHistory)
      ? entry.qrUrlHistory.map((v) => String(v ?? "").trim()).filter(Boolean)
      : [],
    generated_at: entry.generatedAt || new Date().toISOString(),
  };
}

export async function fetchAllStoreZoneQrs(): Promise<ZoneQrByStore> {
  const client = getSupabaseClient();
  const empty: ZoneQrByStore = {};
  if (!client) return empty;
  const collected: StoreZoneQrDbRow[] = [];
  let from = 0;
  while (true) {
    const to = from + FETCH_PAGE_SIZE - 1;
    const { data, error } = await client
      .from("store_zone_qrs")
      .select(
        "id, store_id, zone, zone_id, qr_id, qr_url, qr_image_url, qr_url_history, generated_at",
      )
      .order("store_id", { ascending: true })
      .order("zone", { ascending: true })
      .range(from, to);
    if (error || !data) break;
    for (const row of data as StoreZoneQrDbRow[]) {
      collected.push(row);
    }
    if (data.length < FETCH_PAGE_SIZE) break;
    from += FETCH_PAGE_SIZE;
  }
  const byStore: ZoneQrByStore = {};
  for (const row of collected) {
    const entry = zoneQrFromDb(row);
    if (!entry.storeId || !entry.zoneId) continue;
    const slot = byStore[entry.storeId] ?? (byStore[entry.storeId] = {});
    slot[entry.zoneId] = entry;
  }
  return byStore;
}

export async function replaceAllStoreZoneQrs(
  nextByStore: ZoneQrByStore,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: "Supabase 클라이언트에 연결할 수 없습니다." };
  }
  const dbRows: StoreZoneQrDbRow[] = [];
  const seen = new Set<string>();
  for (const [storeId, byZone] of Object.entries(nextByStore)) {
    if (!byZone || typeof byZone !== "object") continue;
    for (const [zoneId, entry] of Object.entries(byZone)) {
      const dbRow = zoneQrToDb({
        ...entry,
        storeId: entry.storeId || storeId,
        zoneId: entry.zoneId || zoneId,
      });
      if (!dbRow.store_id || !dbRow.zone_id) continue;
      if (seen.has(dbRow.id)) continue;
      seen.add(dbRow.id);
      dbRows.push(dbRow);
    }
  }

  for (let i = 0; i < dbRows.length; i += WRITE_BATCH_SIZE) {
    const batch = dbRows.slice(i, i + WRITE_BATCH_SIZE);
    const { error } = await client
      .from("store_zone_qrs")
      .upsert(batch, { onConflict: "id" });
    if (error) {
      return {
        ok: false,
        message: `매장 QR 저장 중 오류가 발생했습니다. (${error.message})`,
      };
    }
  }

  const { data: existingIds, error: idsErr } = await client
    .from("store_zone_qrs")
    .select("id");
  if (idsErr || !existingIds) {
    return {
      ok: false,
      message: `기존 매장 QR ID 조회 중 오류가 발생했습니다. (${idsErr?.message ?? ""})`,
    };
  }
  const toDelete: string[] = [];
  for (const row of existingIds as Array<{ id: string }>) {
    if (!seen.has(row.id)) toDelete.push(row.id);
  }
  for (let i = 0; i < toDelete.length; i += WRITE_BATCH_SIZE) {
    const batch = toDelete.slice(i, i + WRITE_BATCH_SIZE);
    const { error } = await client
      .from("store_zone_qrs")
      .delete()
      .in("id", batch);
    if (error) {
      return {
        ok: false,
        message: `이전 매장 QR 삭제 중 오류가 발생했습니다. (${error.message})`,
      };
    }
  }
  return { ok: true };
}
