"use client";

import { useMemo, useSyncExternalStore } from "react";
import { INITIAL_PRODUCT_MASTER_ROWS } from "../_data/mockProductMaster";
import { EXCEL_ERROR_CELL_HINT, looksLikeExcelErrorCell } from "./excelFormulaErrorLabel";
import { repairStoredKoreanLabel } from "./textEncodingHeuristic";
import type { ProductGroupRegistryEntry } from "../_types/productGroupRegistry";

const STORAGE_KEY = "digital-pop:product-group-registry";

let registryState: ProductGroupRegistryEntry[] = [];
const listeners = new Set<() => void>();
let hydrated = false;

const AUTO_CODE_RE = /^PG-AUTO-(\d+)$/i;

function buildSeedFromInitialMaster(): ProductGroupRegistryEntry[] {
  const seen = new Map<string, ProductGroupRegistryEntry>();
  let seq = 0;
  for (const row of INITIAL_PRODUCT_MASTER_ROWS) {
    const code = row.productGroupCode.trim();
    const name = row.productGroupName.trim();
    if (!code || !name) continue;
    const key = `${code}\n${name}`;
    if (seen.has(key)) continue;
    seen.set(key, {
      id: `pgr-seed-${seq}`,
      productGroupCode: code,
      productGroupName: name,
      usesOptionRules: false,
    });
    seq += 1;
  }
  return [...seen.values()];
}

function nextAutoCode(entries: ProductGroupRegistryEntry[]): string {
  let max = 0;
  for (const e of entries) {
    const m = e.productGroupCode.trim().match(AUTO_CODE_RE);
    if (m?.[1]) {
      max = Math.max(max, Number(m[1]));
    }
  }
  return `PG-AUTO-${String(max + 1).padStart(6, "0")}`;
}

function normalizeRegistry(entries: ProductGroupRegistryEntry[]): ProductGroupRegistryEntry[] {
  return entries.map((e) => {
    const trimmedName = e.productGroupName.trim();
    return {
      ...e,
      productGroupCode: e.productGroupCode.trim(),
      productGroupName: repairStoredKoreanLabel(trimmedName),
      usesOptionRules: e.usesOptionRules === true,
    };
  });
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function hydrateFromStorage(): void {
  if (hydrated || typeof window === "undefined") {
    return;
  }
  hydrated = true;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    registryState = buildSeedFromInitialMaster();
    persistToStorage(registryState);
    return;
  }
  try {
    const parsed = JSON.parse(raw) as ProductGroupRegistryEntry[];
    if (!Array.isArray(parsed)) {
      registryState = buildSeedFromInitialMaster();
      persistToStorage(registryState);
      return;
    }
    /** 저장된 `[]`는 사용자가 전체 삭제한 상태로 유지한다 (시드로 되돌리지 않음). */
    if (parsed.length === 0) {
      registryState = [];
      persistToStorage([]);
      return;
    }
    registryState = normalizeRegistry(parsed);
    persistToStorage(registryState);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    registryState = buildSeedFromInitialMaster();
    persistToStorage(registryState);
  }
}

function persistToStorage(next: ProductGroupRegistryEntry[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getProductGroupRegistrySnapshot(): ProductGroupRegistryEntry[] {
  hydrateFromStorage();
  return registryState;
}

export function subscribeProductGroupRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setProductGroupRegistryEntries(next: ProductGroupRegistryEntry[]): void {
  registryState = normalizeRegistry(next);
  persistToStorage(registryState);
  notify();
}

export function useProductGroupRegistry(): [
  ProductGroupRegistryEntry[],
  (next: ProductGroupRegistryEntry[]) => void,
] {
  const entries = useSyncExternalStore(
    subscribeProductGroupRegistry,
    getProductGroupRegistrySnapshot,
    () => buildSeedFromInitialMaster(),
  );
  const setEntries = useMemo(() => (next: ProductGroupRegistryEntry[]) => setProductGroupRegistryEntries(next), []);
  return [entries, setEntries];
}

/** 코드·상품군명이 레지스트리 한 건과 정확히 일치하는지 (구 엑셀 호환용) */
export function findRegistryExactMatch(
  entries: ProductGroupRegistryEntry[],
  productGroupCode: string,
  productGroupName: string,
): ProductGroupRegistryEntry | undefined {
  const c = productGroupCode.trim();
  const n = productGroupName.trim();
  return entries.find((e) => e.productGroupCode === c && e.productGroupName === n);
}

/** 상품군명만으로 레지스트리 행 조회 (정규화 후 비교). 등록 시 이름 유일을 전제로 한다. */
export function findRegistryByNormalizedName(
  entries: ProductGroupRegistryEntry[],
  productGroupName: string,
): ProductGroupRegistryEntry | undefined {
  const n = repairStoredKoreanLabel(productGroupName.trim());
  if (!n) return undefined;
  return entries.find((e) => repairStoredKoreanLabel(e.productGroupName.trim()) === n);
}

/** 신규 양식(상품군명만) 업로드 행 검증 */
export function resolveRegistryUploadFailureReasonByName(
  entries: ProductGroupRegistryEntry[],
  productGroupName: string,
): string | null {
  const raw = productGroupName.trim();
  if (!raw) {
    return "상품군명이 비어 있습니다.";
  }
  if (!findRegistryByNormalizedName(entries, raw)) {
    return `상품군 관리에 등록되지 않은 상품군명입니다. (${repairStoredKoreanLabel(raw)})`;
  }
  return null;
}

/** 구 양식(상품군코드+명): 검증 실패 시 메시지, 성공 시 null */
export function resolveRegistryUploadFailureReason(
  entries: ProductGroupRegistryEntry[],
  productGroupCode: string,
  productGroupName: string,
): string | null {
  const name = productGroupName.trim();
  const code = productGroupCode.trim();
  if (!name) {
    return "상품군명이 비어 있습니다.";
  }
  const byName = findRegistryByNormalizedName(entries, name);
  if (!byName) {
    return `상품군 관리에 등록되지 않은 상품군명입니다. (${repairStoredKoreanLabel(name)})`;
  }
  if (!code) {
    return "상품군 코드 열이 비어 있습니다. (구 양식에서는 코드 열이 필요합니다)";
  }
  if (byName.productGroupCode.trim() !== code) {
    return `파일의 상품군 코드가 등록 정보와 일치하지 않습니다. (등록: ${byName.productGroupCode}, 파일: ${code})`;
  }
  return null;
}

export function addProductGroupByName(
  entries: ProductGroupRegistryEntry[],
  productGroupName: string,
  opts?: { usesOptionRules?: boolean },
): { ok: true; next: ProductGroupRegistryEntry[] } | { ok: false; reason: string } {
  const name = repairStoredKoreanLabel(productGroupName.trim());
  if (!name) {
    return { ok: false, reason: "상품군명을 입력해 주세요." };
  }
  if (looksLikeExcelErrorCell(name)) {
    return { ok: false, reason: EXCEL_ERROR_CELL_HINT };
  }
  if (entries.some((e) => repairStoredKoreanLabel(e.productGroupName.trim()) === name)) {
    return { ok: false, reason: "이미 등록된 상품군명입니다." };
  }
  const id = `pgr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const productGroupCode = nextAutoCode(entries);
  const entry: ProductGroupRegistryEntry = {
    id,
    productGroupCode,
    productGroupName: name,
    usesOptionRules: opts?.usesOptionRules === true,
  };
  return { ok: true, next: [...entries, entry] };
}

export function setProductGroupUsesOptionRules(
  entries: ProductGroupRegistryEntry[],
  id: string,
  usesOptionRules: boolean,
): ProductGroupRegistryEntry[] {
  return entries.map((e) => (e.id === id ? { ...e, usesOptionRules } : e));
}

export function renameProductGroupRegistryEntry(
  entries: ProductGroupRegistryEntry[],
  id: string,
  newName: string,
): { ok: true; next: ProductGroupRegistryEntry[] } | { ok: false; reason: string } {
  const name = repairStoredKoreanLabel(newName.trim());
  if (!name) {
    return { ok: false, reason: "상품군명을 입력해 주세요." };
  }
  if (looksLikeExcelErrorCell(name)) {
    return { ok: false, reason: EXCEL_ERROR_CELL_HINT };
  }
  const exists = entries.some(
    (e) => e.id !== id && repairStoredKoreanLabel(e.productGroupName.trim()) === name,
  );
  if (exists) {
    return { ok: false, reason: "이미 등록된 상품군명입니다." };
  }
  const idx = entries.findIndex((e) => e.id === id);
  if (idx < 0) {
    return { ok: false, reason: "항목을 찾을 수 없습니다." };
  }
  const next = entries.map((e) => (e.id === id ? { ...e, productGroupName: name } : e));
  return { ok: true, next };
}

export function deleteProductGroupRegistryEntry(
  entries: ProductGroupRegistryEntry[],
  id: string,
): ProductGroupRegistryEntry[] {
  return entries.filter((e) => e.id !== id);
}

/** 브라우저 저장소의 상품군 레지스트리를 비운다. 상품 마스터 행과 불일치할 수 있다. */
export function clearProductGroupRegistry(): void {
  registryState = [];
  persistToStorage([]);
  notify();
}
