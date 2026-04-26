"use client";

import { useMemo, useSyncExternalStore } from "react";

export type StoreOperationRow = {
  storeId: string;
  zone: string;
  productCode: string;
  colorCode: string;
};

export type StoreOperationRowsByStore = Record<string, StoreOperationRow[]>;

const STORAGE_KEY = "digital-pop:store-operation-rows";
const EMPTY_ROWS_BY_STORE: StoreOperationRowsByStore = {};

let rowsByStoreState: StoreOperationRowsByStore = {};
const listeners = new Set<() => void>();
let hydrated = false;

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

function hydrateFromStorage(): void {
  if (hydrated || typeof window === "undefined") {
    return;
  }
  hydrated = true;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }
  try {
    const parsed = JSON.parse(raw) as StoreOperationRowsByStore;
    if (parsed && typeof parsed === "object") {
      rowsByStoreState = normalizeRowsByStore(parsed);
      persistToStorage(rowsByStoreState);
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function persistToStorage(nextRowsByStore: StoreOperationRowsByStore): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRowsByStore));
}

export function getStoreOperationRowsSnapshot(): StoreOperationRowsByStore {
  hydrateFromStorage();
  return rowsByStoreState;
}

export function subscribeStoreOperationRows(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setStoreOperationRows(nextRowsByStore: StoreOperationRowsByStore): void {
  rowsByStoreState = normalizeRowsByStore(nextRowsByStore);
  persistToStorage(rowsByStoreState);
  notify();
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
