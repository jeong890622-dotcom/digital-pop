"use client";

import type { ProductGroupRegistryEntry } from "../_types/productGroupRegistry";
import type { ProductGroupOptionRule } from "../_types/productGroupOption";
import type { ProductEventRules } from "../_types/productBadge";
import { getSupabaseClient } from "./supabase";

const FETCH_PAGE_SIZE = 1000;
const WRITE_BATCH_SIZE = 500;

/* =========================================================================
 * 1. product_group_registry (상품군 관리)
 * =======================================================================*/

export type ProductGroupRegistryDbRow = {
  id: string;
  product_group_code: string;
  product_group_name: string;
  uses_option_rules: boolean;
};

function registryFromDb(row: ProductGroupRegistryDbRow): ProductGroupRegistryEntry {
  return {
    id: row.id,
    productGroupCode: row.product_group_code ?? "",
    productGroupName: row.product_group_name ?? "",
    usesOptionRules: row.uses_option_rules === true,
  };
}

function registryToDb(entry: ProductGroupRegistryEntry): ProductGroupRegistryDbRow {
  return {
    id: entry.id,
    product_group_code: (entry.productGroupCode ?? "").trim(),
    product_group_name: (entry.productGroupName ?? "").trim(),
    uses_option_rules: entry.usesOptionRules === true,
  };
}

export async function fetchAllProductGroupRegistry(): Promise<ProductGroupRegistryEntry[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const collected: ProductGroupRegistryEntry[] = [];
  let from = 0;
  while (true) {
    const to = from + FETCH_PAGE_SIZE - 1;
    const { data, error } = await client
      .from("product_group_registry")
      .select("id, product_group_code, product_group_name, uses_option_rules")
      .order("product_group_name", { ascending: true })
      .range(from, to);
    if (error || !data) break;
    for (const row of data as ProductGroupRegistryDbRow[]) {
      collected.push(registryFromDb(row));
    }
    if (data.length < FETCH_PAGE_SIZE) break;
    from += FETCH_PAGE_SIZE;
  }
  return collected;
}

export async function replaceAllProductGroupRegistry(
  nextEntries: ProductGroupRegistryEntry[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: "Supabase 클라이언트에 연결할 수 없습니다." };
  }
  const dbRows = nextEntries.map(registryToDb);
  const nextIdSet = new Set(dbRows.map((r) => r.id));

  for (let i = 0; i < dbRows.length; i += WRITE_BATCH_SIZE) {
    const batch = dbRows.slice(i, i + WRITE_BATCH_SIZE);
    const { error } = await client
      .from("product_group_registry")
      .upsert(batch, { onConflict: "id" });
    if (error) {
      return {
        ok: false,
        message: `상품군 저장 중 오류가 발생했습니다. (${error.message})`,
      };
    }
  }

  const { data: existingIds, error: idsErr } = await client
    .from("product_group_registry")
    .select("id");
  if (idsErr || !existingIds) {
    return {
      ok: false,
      message: `기존 상품군 ID 조회 중 오류가 발생했습니다. (${idsErr?.message ?? ""})`,
    };
  }
  const toDelete: string[] = [];
  for (const row of existingIds as Array<{ id: string }>) {
    if (!nextIdSet.has(row.id)) toDelete.push(row.id);
  }
  for (let i = 0; i < toDelete.length; i += WRITE_BATCH_SIZE) {
    const batch = toDelete.slice(i, i + WRITE_BATCH_SIZE);
    const { error } = await client
      .from("product_group_registry")
      .delete()
      .in("id", batch);
    if (error) {
      return {
        ok: false,
        message: `이전 상품군 삭제 중 오류가 발생했습니다. (${error.message})`,
      };
    }
  }
  return { ok: true };
}

/* =========================================================================
 * 2. product_group_options (상품군별 옵션 관리)
 * =======================================================================*/

export type ProductGroupOptionDbRow = {
  id: string;
  group_name: string;
  size_label: string;
  option_name: string;
  linked_product_code: string;
  sort_order: number;
  is_active: boolean;
};

function optionFromDb(row: ProductGroupOptionDbRow): ProductGroupOptionRule {
  return {
    id: row.id,
    groupName: row.group_name ?? "",
    sizeLabel: row.size_label ?? "Standard",
    optionName: row.option_name ?? "",
    linkedProductCode: row.linked_product_code ?? "",
    sortOrder:
      typeof row.sort_order === "number" && Number.isFinite(row.sort_order)
        ? row.sort_order
        : 0,
    isActive: row.is_active !== false,
  };
}

function optionToDb(rule: ProductGroupOptionRule): ProductGroupOptionDbRow {
  return {
    id: rule.id,
    group_name: (rule.groupName ?? "").trim(),
    size_label: (rule.sizeLabel ?? "Standard").trim() || "Standard",
    option_name: (rule.optionName ?? "").trim(),
    linked_product_code: (rule.linkedProductCode ?? "").trim(),
    sort_order: Number.isFinite(rule.sortOrder) ? rule.sortOrder : 0,
    is_active: rule.isActive !== false,
  };
}

export async function fetchAllProductGroupOptions(): Promise<ProductGroupOptionRule[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const collected: ProductGroupOptionRule[] = [];
  let from = 0;
  while (true) {
    const to = from + FETCH_PAGE_SIZE - 1;
    const { data, error } = await client
      .from("product_group_options")
      .select(
        "id, group_name, size_label, option_name, linked_product_code, sort_order, is_active",
      )
      .order("group_name", { ascending: true })
      .order("size_label", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("option_name", { ascending: true })
      .range(from, to);
    if (error || !data) break;
    for (const row of data as ProductGroupOptionDbRow[]) {
      collected.push(optionFromDb(row));
    }
    if (data.length < FETCH_PAGE_SIZE) break;
    from += FETCH_PAGE_SIZE;
  }
  return collected;
}

export async function replaceAllProductGroupOptions(
  nextRules: ProductGroupOptionRule[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: "Supabase 클라이언트에 연결할 수 없습니다." };
  }
  const dbRows = nextRules.map(optionToDb);
  const nextIdSet = new Set(dbRows.map((r) => r.id));

  for (let i = 0; i < dbRows.length; i += WRITE_BATCH_SIZE) {
    const batch = dbRows.slice(i, i + WRITE_BATCH_SIZE);
    const { error } = await client
      .from("product_group_options")
      .upsert(batch, { onConflict: "id" });
    if (error) {
      return {
        ok: false,
        message: `상품군 옵션 저장 중 오류가 발생했습니다. (${error.message})`,
      };
    }
  }

  const { data: existingIds, error: idsErr } = await client
    .from("product_group_options")
    .select("id");
  if (idsErr || !existingIds) {
    return {
      ok: false,
      message: `기존 상품군 옵션 ID 조회 중 오류가 발생했습니다. (${idsErr?.message ?? ""})`,
    };
  }
  const toDelete: string[] = [];
  for (const row of existingIds as Array<{ id: string }>) {
    if (!nextIdSet.has(row.id)) toDelete.push(row.id);
  }
  for (let i = 0; i < toDelete.length; i += WRITE_BATCH_SIZE) {
    const batch = toDelete.slice(i, i + WRITE_BATCH_SIZE);
    const { error } = await client
      .from("product_group_options")
      .delete()
      .in("id", batch);
    if (error) {
      return {
        ok: false,
        message: `이전 상품군 옵션 삭제 중 오류가 발생했습니다. (${error.message})`,
      };
    }
  }
  return { ok: true };
}

/* =========================================================================
 * 3. product_event_rules (벽부필수 / NEW / BEST 코드)
 * =======================================================================*/

export type ProductEventKind = "wall-required" | "new" | "best";

export type ProductEventRuleDbRow = {
  id: string;
  kind: ProductEventKind;
  product_code: string;
};

function dedupeCodes(list: string[]): string[] {
  return [...new Set(list.map((v) => String(v).trim()).filter(Boolean))];
}

export async function fetchProductEventRules(): Promise<ProductEventRules> {
  const empty: ProductEventRules = {
    wallRequiredProductCodes: [],
    newProductCodes: [],
    bestProductCodes: [],
  };
  const client = getSupabaseClient();
  if (!client) return empty;
  const collected: ProductEventRuleDbRow[] = [];
  let from = 0;
  while (true) {
    const to = from + FETCH_PAGE_SIZE - 1;
    const { data, error } = await client
      .from("product_event_rules")
      .select("id, kind, product_code")
      .range(from, to);
    if (error || !data) break;
    for (const row of data as ProductEventRuleDbRow[]) {
      collected.push(row);
    }
    if (data.length < FETCH_PAGE_SIZE) break;
    from += FETCH_PAGE_SIZE;
  }
  const wall: string[] = [];
  const news: string[] = [];
  const best: string[] = [];
  for (const row of collected) {
    const code = (row.product_code ?? "").trim();
    if (!code) continue;
    if (row.kind === "wall-required") wall.push(code);
    else if (row.kind === "new") news.push(code);
    else if (row.kind === "best") best.push(code);
  }
  return {
    wallRequiredProductCodes: dedupeCodes(wall),
    newProductCodes: dedupeCodes(news),
    bestProductCodes: dedupeCodes(best),
  };
}

/**
 * 이벤트 규칙 전체를 nextRules 로 교체합니다.
 * 각 (kind, product_code) 조합당 한 row 로 평탄화 저장합니다.
 */
export async function replaceProductEventRules(
  nextRules: ProductEventRules,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: "Supabase 클라이언트에 연결할 수 없습니다." };
  }
  const dbRows: ProductEventRuleDbRow[] = [];
  const seen = new Set<string>();
  const addAll = (codes: string[], kind: ProductEventKind) => {
    for (const raw of codes) {
      const code = String(raw ?? "").trim();
      if (!code) continue;
      const key = `${kind}|${code}`;
      if (seen.has(key)) continue;
      seen.add(key);
      dbRows.push({ id: key, kind, product_code: code });
    }
  };
  addAll(nextRules.wallRequiredProductCodes, "wall-required");
  addAll(nextRules.newProductCodes, "new");
  addAll(nextRules.bestProductCodes, "best");

  const nextIdSet = new Set(dbRows.map((r) => r.id));

  for (let i = 0; i < dbRows.length; i += WRITE_BATCH_SIZE) {
    const batch = dbRows.slice(i, i + WRITE_BATCH_SIZE);
    const { error } = await client
      .from("product_event_rules")
      .upsert(batch, { onConflict: "id" });
    if (error) {
      return {
        ok: false,
        message: `이벤트 규칙 저장 중 오류가 발생했습니다. (${error.message})`,
      };
    }
  }

  const { data: existingIds, error: idsErr } = await client
    .from("product_event_rules")
    .select("id");
  if (idsErr || !existingIds) {
    return {
      ok: false,
      message: `기존 이벤트 규칙 ID 조회 중 오류가 발생했습니다. (${idsErr?.message ?? ""})`,
    };
  }
  const toDelete: string[] = [];
  for (const row of existingIds as Array<{ id: string }>) {
    if (!nextIdSet.has(row.id)) toDelete.push(row.id);
  }
  for (let i = 0; i < toDelete.length; i += WRITE_BATCH_SIZE) {
    const batch = toDelete.slice(i, i + WRITE_BATCH_SIZE);
    const { error } = await client
      .from("product_event_rules")
      .delete()
      .in("id", batch);
    if (error) {
      return {
        ok: false,
        message: `이전 이벤트 규칙 삭제 중 오류가 발생했습니다. (${error.message})`,
      };
    }
  }
  return { ok: true };
}
