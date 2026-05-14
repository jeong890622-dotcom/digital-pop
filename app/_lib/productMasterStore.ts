"use client";

import { useMemo, useSyncExternalStore } from "react";
import { type ProductMasterRow } from "../_data/mockProductMaster";
import {
  fetchAllProductMaster,
  replaceAllProductMaster,
} from "./supabaseProducts";

/**
 * useSyncExternalStore 의 getServerSnapshot 이 매 호출마다 같은 참조를
 * 반환해야 React 의 무한 루프 경고를 피할 수 있다.
 */
const EMPTY_ROWS: ProductMasterRow[] = [];

let rowsState: ProductMasterRow[] = [];
const listeners = new Set<() => void>();
let hydrated = false;
let hydrationInFlight: Promise<void> | null = null;
let lastSyncError: string | null = null;

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
      category: typeof row.category === "string" ? row.category.trim() : "",
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

function hydrate(): void {
  if (hydrated || hydrationInFlight) return;
  if (typeof window === "undefined") return;
  hydrationInFlight = (async () => {
    try {
      const remote = await fetchAllProductMaster();
      rowsState = normalizeRows(remote);
    } catch {
      // 네트워크 실패 시 빈 상태 유지
    } finally {
      hydrated = true;
      hydrationInFlight = null;
      notify();
    }
  })();
}

export function getProductMasterRowsSnapshot(): ProductMasterRow[] {
  hydrate();
  return rowsState;
}

export function subscribeProductMasterRows(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProductMasterLastSyncError(): string | null {
  return lastSyncError;
}

export async function reloadProductMasterRows(): Promise<void> {
  const remote = await fetchAllProductMaster();
  rowsState = normalizeRows(remote);
  hydrated = true;
  notify();
}

/**
 * 상품 마스터 전체를 nextRows 로 교체합니다.
 * - 화면(local state)에는 즉시 반영하고, 백그라운드로 Supabase 와 sync.
 * - sync 실패 시 lastSyncError 에 사유가 저장되고, alert 으로 안내합니다.
 */
export function setProductMasterRows(nextRows: ProductMasterRow[]): void {
  const normalized = normalizeRows(nextRows);
  rowsState = normalized;
  hydrated = true;
  notify();
  void (async () => {
    const result = await replaceAllProductMaster(normalized);
    if (!result.ok) {
      lastSyncError = result.message;
      if (typeof window !== "undefined") {
        // 비개발자 운영자가 실패를 인지할 수 있도록 명확히 알림
        window.alert(
          `상품 마스터 저장에 실패했습니다.\n${result.message}\n페이지를 새로고침한 뒤 다시 시도해 주세요.`,
        );
      }
      return;
    }
    lastSyncError = null;
  })();
}

export function useProductMasterRows(): [
  ProductMasterRow[],
  (nextRows: ProductMasterRow[]) => void,
] {
  const rows = useSyncExternalStore(
    subscribeProductMasterRows,
    getProductMasterRowsSnapshot,
    () => EMPTY_ROWS,
  );
  const setRows = useMemo(
    () => (nextRows: ProductMasterRow[]) => setProductMasterRows(nextRows),
    [],
  );
  return [rows, setRows];
}

/** Supabase 상품 마스터 hydrate 완료 여부(고객 화면에서 로딩 구분용) */
export function useProductMasterHydrated(): boolean {
  return useSyncExternalStore(
    subscribeProductMasterRows,
    () => {
      hydrate();
      return hydrated;
    },
    () => false,
  );
}
