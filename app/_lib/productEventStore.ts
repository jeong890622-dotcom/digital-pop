"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { ProductEventRules } from "../_types/productBadge";
import {
  fetchProductEventRules,
  replaceProductEventRules,
} from "./supabaseProductGroups";

const DEFAULT_RULES: ProductEventRules = {
  wallRequiredProductCodes: [],
  newProductCodes: [],
  bestProductCodes: [],
  promotionProductCodes: [],
  displaySaleProductCodes: [],
};

let state: ProductEventRules = DEFAULT_RULES;
const listeners = new Set<() => void>();
let hydrated = false;
let hydrationInFlight: Promise<void> | null = null;
let lastSyncError: string | null = null;

function normalizeCodeList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map((v) => String(v).trim()).filter(Boolean))];
}

function normalizeRules(raw: Partial<ProductEventRules>): ProductEventRules {
  return {
    wallRequiredProductCodes: normalizeCodeList(raw.wallRequiredProductCodes),
    newProductCodes: normalizeCodeList(raw.newProductCodes),
    bestProductCodes: normalizeCodeList(raw.bestProductCodes),
    promotionProductCodes: normalizeCodeList(raw.promotionProductCodes),
    displaySaleProductCodes: normalizeCodeList(raw.displaySaleProductCodes),
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

function hydrate(): void {
  if (hydrated || hydrationInFlight) return;
  if (typeof window === "undefined") return;
  hydrationInFlight = (async () => {
    try {
      const remote = await fetchProductEventRules();
      state = normalizeRules(remote);
    } catch {
      // 네트워크 실패 시 빈 상태 유지
    } finally {
      hydrated = true;
      hydrationInFlight = null;
      notify();
    }
  })();
}

export function getProductEventRulesSnapshot(): ProductEventRules {
  hydrate();
  return state;
}

export function subscribeProductEventRules(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getProductEventRulesLastSyncError(): string | null {
  return lastSyncError;
}

export async function reloadProductEventRules(): Promise<void> {
  const remote = await fetchProductEventRules();
  state = normalizeRules(remote);
  hydrated = true;
  notify();
}

export function setProductEventRules(next: ProductEventRules): void {
  state = normalizeRules(next);
  hydrated = true;
  notify();
  void (async () => {
    const result = await replaceProductEventRules(state);
    if (!result.ok) {
      lastSyncError = result.message;
      if (typeof window !== "undefined") {
        window.alert(
          `이벤트 규칙 저장에 실패했습니다.\n${result.message}\n페이지를 새로고침한 뒤 다시 시도해 주세요.`,
        );
      }
      return;
    }
    lastSyncError = null;
  })();
}

export function useProductEventRules(): [
  ProductEventRules,
  (next: ProductEventRules) => void,
] {
  const rules = useSyncExternalStore(
    subscribeProductEventRules,
    getProductEventRulesSnapshot,
    () => DEFAULT_RULES,
  );
  const setRules = useMemo(
    () => (next: ProductEventRules) => setProductEventRules(next),
    [],
  );
  return [rules, setRules];
}
