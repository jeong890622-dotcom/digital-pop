"use client";

import { useMemo, useSyncExternalStore } from "react";
import { INITIAL_PRODUCT_MASTER_ROWS, type ProductMasterRow } from "../_data/mockProductMaster";

const STORAGE_KEY = "digital-pop:product-master-rows";

let rowsState: ProductMasterRow[] = INITIAL_PRODUCT_MASTER_ROWS;
const listeners = new Set<() => void>();
let hydrated = false;

function isRenderableImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;
  if (trimmed.startsWith("data:image/")) return true;
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return true;
  return /\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(trimmed);
}

function normalizeRows(rows: ProductMasterRow[]): ProductMasterRow[] {
  return rows.map((row) => {
    const rawConsumer = (row as { consumerPrice?: unknown }).consumerPrice;
    const consumerPrice =
      typeof rawConsumer === "number" && Number.isFinite(rawConsumer) && rawConsumer >= 0
        ? rawConsumer
        : 0;
    return {
      ...row,
      consumerPrice,
      imageUrl: isRenderableImageUrl(row.imageUrl) ? row.imageUrl : "/window.svg",
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
    return;
  }
  try {
    const parsed = JSON.parse(raw) as ProductMasterRow[];
    if (Array.isArray(parsed)) {
      rowsState = normalizeRows(parsed);
      persistToStorage(rowsState);
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function persistToStorage(nextRows: ProductMasterRow[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRows));
}

export function getProductMasterRowsSnapshot(): ProductMasterRow[] {
  hydrateFromStorage();
  return rowsState;
}

export function subscribeProductMasterRows(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setProductMasterRows(nextRows: ProductMasterRow[]): void {
  rowsState = normalizeRows(nextRows);
  persistToStorage(rowsState);
  notify();
}

export function useProductMasterRows(): [ProductMasterRow[], (nextRows: ProductMasterRow[]) => void] {
  const rows = useSyncExternalStore(
    subscribeProductMasterRows,
    getProductMasterRowsSnapshot,
    () => INITIAL_PRODUCT_MASTER_ROWS,
  );
  const setRows = useMemo(() => (nextRows: ProductMasterRow[]) => setProductMasterRows(nextRows), []);
  return [rows, setRows];
}
