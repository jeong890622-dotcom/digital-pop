"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  fetchAllStoreMerchandising,
  replaceAllStoreMerchandising,
} from "./supabaseStoreOperations";

export type StoreOperationRow = {
  storeId: string;
  zone: string;
  productCode: string;
  colorCode: string;
  /**
   * 동일 zone 내 사용자 화면 노출 순서.
   * null 이면 상품 마스터 카테고리 순(고정 목록)으로 정렬.
   * 숫자가 있으면 해당 zone에서 수동(드래그) 순서가 적용된 것으로 본다.
   */
  sortOrder: number | null;
};

export type StoreOperationRowsByStore = Record<string, StoreOperationRow[]>;

const EMPTY_ROWS_BY_STORE: StoreOperationRowsByStore = {};

let rowsByStoreState: StoreOperationRowsByStore = {};
const listeners = new Set<() => void>();
let hydrated = false;
let hydrationInFlight: Promise<void> | null = null;
let lastSyncError: string | null = null;

function normalizeRowsByStore(
  rowsByStore: StoreOperationRowsByStore,
): StoreOperationRowsByStore {
  const normalized: StoreOperationRowsByStore = {};
  for (const [storeId, rows] of Object.entries(rowsByStore)) {
    if (!Array.isArray(rows)) {
      continue;
    }
    normalized[storeId] = rows
      .map((row) => ({
        storeId: row.storeId?.trim() || storeId,
        zone: row.zone?.trim() || "",
        productCode: row.productCode?.trim() || "",
        colorCode: row.colorCode?.trim() || "",
        sortOrder:
          typeof row.sortOrder === "number" && Number.isFinite(row.sortOrder) ? row.sortOrder : null,
      }))
      .filter((row) => row.zone && row.productCode && row.colorCode);
  }
  return normalized;
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function hydrate(): void {
  if (hydrated || hydrationInFlight) return;
  if (typeof window === "undefined") return;
  hydrationInFlight = (async () => {
    try {
      const remote = await fetchAllStoreMerchandising();
      rowsByStoreState = normalizeRowsByStore(remote);
    } catch {
      // 네트워크 실패 시 빈 상태 유지
    } finally {
      hydrated = true;
      hydrationInFlight = null;
      notify();
    }
  })();
}

export function getStoreOperationRowsSnapshot(): StoreOperationRowsByStore {
  hydrate();
  return rowsByStoreState;
}

export function subscribeStoreOperationRows(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStoreOperationRowsLastSyncError(): string | null {
  return lastSyncError;
}

export async function reloadStoreOperationRows(): Promise<void> {
  const remote = await fetchAllStoreMerchandising();
  rowsByStoreState = normalizeRowsByStore(remote);
  hydrated = true;
  notify();
}

export function setStoreOperationRows(nextRowsByStore: StoreOperationRowsByStore): void {
  rowsByStoreState = normalizeRowsByStore(nextRowsByStore);
  hydrated = true;
  notify();
  void (async () => {
    const result = await replaceAllStoreMerchandising(rowsByStoreState);
    if (!result.ok) {
      lastSyncError = result.message;
      if (typeof window !== "undefined") {
        window.alert(
          `매장 진열 저장에 실패했습니다.\n${result.message}\n페이지를 새로고침한 뒤 다시 시도해 주세요.`,
        );
      }
      return;
    }
    lastSyncError = null;
  })();
}

export function useStoreOperationRows(): [
  StoreOperationRowsByStore,
  (nextRowsByStore: StoreOperationRowsByStore) => void,
] {
  const rowsByStore = useSyncExternalStore(
    subscribeStoreOperationRows,
    getStoreOperationRowsSnapshot,
    () => EMPTY_ROWS_BY_STORE,
  );
  const setRowsByStore = useMemo(
    () => (nextRowsByStore: StoreOperationRowsByStore) => setStoreOperationRows(nextRowsByStore),
    [],
  );
  return [rowsByStore, setRowsByStore];
}
