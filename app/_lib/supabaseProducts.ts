"use client";

import type { ProductMasterRow } from "../_data/mockProductMaster";
import { getSupabaseClient } from "./supabase";

/** Supabase product_master 행 (DB 컬럼명 그대로) */
export type ProductMasterDbRow = {
  id: string;
  product_group_code: string;
  product_group_name: string;
  product_name: string;
  product_code: string;
  color_code: string;
  size_label: string;
  image_url: string;
  consumer_price: number;
  membership_price: number;
  detail_url: string;
};

export function fromDbRow(row: ProductMasterDbRow): ProductMasterRow {
  return {
    id: row.id,
    productGroupCode: row.product_group_code ?? "",
    productGroupName: row.product_group_name ?? "",
    productName: row.product_name ?? "",
    productCode: row.product_code ?? "",
    colorCode: row.color_code ?? "",
    sizeLabel: row.size_label ?? "",
    imageUrl: row.image_url ?? "",
    consumerPrice:
      typeof row.consumer_price === "number" && Number.isFinite(row.consumer_price)
        ? row.consumer_price
        : 0,
    membershipPrice:
      typeof row.membership_price === "number" && Number.isFinite(row.membership_price)
        ? row.membership_price
        : 0,
    detailUrl: row.detail_url ?? "",
  };
}

export function toDbRow(row: ProductMasterRow): ProductMasterDbRow {
  return {
    id: row.id,
    product_group_code: row.productGroupCode ?? "",
    product_group_name: row.productGroupName ?? "",
    product_name: row.productName ?? "",
    product_code: row.productCode ?? "",
    color_code: row.colorCode ?? "",
    size_label: row.sizeLabel ?? "",
    image_url: row.imageUrl ?? "",
    consumer_price: Number.isFinite(row.consumerPrice) ? row.consumerPrice : 0,
    membership_price: Number.isFinite(row.membershipPrice) ? row.membershipPrice : 0,
    detail_url: row.detailUrl ?? "",
  };
}

const FETCH_PAGE_SIZE = 1000;
const WRITE_BATCH_SIZE = 500;

/** 전체 상품 마스터 조회 (페이지네이션으로 안전하게 끝까지 가져옴) */
export async function fetchAllProductMaster(): Promise<ProductMasterRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const collected: ProductMasterRow[] = [];
  let from = 0;
  while (true) {
    const to = from + FETCH_PAGE_SIZE - 1;
    const { data, error } = await client
      .from("product_master")
      .select(
        "id, product_group_code, product_group_name, product_name, product_code, color_code, size_label, image_url, consumer_price, membership_price, detail_url",
      )
      .order("product_group_name", { ascending: true })
      .order("product_code", { ascending: true })
      .order("color_code", { ascending: true })
      .order("size_label", { ascending: true })
      .range(from, to);
    if (error || !data) break;
    for (const row of data as ProductMasterDbRow[]) {
      collected.push(fromDbRow(row));
    }
    if (data.length < FETCH_PAGE_SIZE) break;
    from += FETCH_PAGE_SIZE;
  }
  return collected;
}

/**
 * 상품 마스터 전체를 nextRows 로 완전 교체합니다.
 * - 동시 사용자가 한 명(마스터) 정도라는 전제로 단순 sync 사용.
 * - 안전을 위해 먼저 신규 데이터를 모두 insert/upsert 한 뒤, 기존 행 중 새 데이터에 없는 id 만 삭제.
 *   (잠시라도 "비어 있는" 상태가 보이지 않도록)
 */
export async function replaceAllProductMaster(
  nextRows: ProductMasterRow[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: "Supabase 클라이언트에 연결할 수 없습니다." };
  }
  const dbRows = nextRows.map(toDbRow);
  const nextIdSet = new Set(dbRows.map((r) => r.id));

  // 1) upsert (id 기준)
  for (let i = 0; i < dbRows.length; i += WRITE_BATCH_SIZE) {
    const batch = dbRows.slice(i, i + WRITE_BATCH_SIZE);
    const { error } = await client.from("product_master").upsert(batch, { onConflict: "id" });
    if (error) {
      return {
        ok: false,
        message: `상품 마스터 저장 중 오류가 발생했습니다. (${error.message})`,
      };
    }
  }

  // 2) 기존 행 가운데 next 에 없는 id 만 삭제
  const { data: existingIds, error: idsErr } = await client
    .from("product_master")
    .select("id");
  if (idsErr || !existingIds) {
    return {
      ok: false,
      message: `기존 상품 마스터 ID 조회 중 오류가 발생했습니다. (${idsErr?.message ?? ""})`,
    };
  }
  const toDelete: string[] = [];
  for (const row of existingIds as Array<{ id: string }>) {
    if (!nextIdSet.has(row.id)) {
      toDelete.push(row.id);
    }
  }
  for (let i = 0; i < toDelete.length; i += WRITE_BATCH_SIZE) {
    const batch = toDelete.slice(i, i + WRITE_BATCH_SIZE);
    const { error } = await client.from("product_master").delete().in("id", batch);
    if (error) {
      return {
        ok: false,
        message: `이전 상품 마스터 삭제 중 오류가 발생했습니다. (${error.message})`,
      };
    }
  }
  return { ok: true };
}
