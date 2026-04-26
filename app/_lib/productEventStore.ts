"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { ProductEventRules } from "../_types/productBadge";

const STORAGE_KEY = "digital-pop:product-event-rules";

const DEFAULT_RULES: ProductEventRules = {
  wallRequiredProductCodes: [],
  newProductCodes: [],
  bestProductCodes: [],
};

let state: ProductEventRules = DEFAULT_RULES;
const listeners = new Set<() => void>();
let hydrated = false;

function normalizeCodeList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map((v) => String(v).trim()).filter(Boolean))];
}

function normalizeRules(raw: Partial<ProductEventRules>): ProductEventRules {
  return {
    wallRequiredProductCodes: normalizeCodeList(raw.wallRequiredProductCodes),
    newProductCodes: normalizeCodeList(raw.newProductCodes),
    bestProductCodes: normalizeCodeList(raw.bestProductCodes),
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Partial<ProductEventRules>;
    state = normalizeRules(parsed);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function persist(next: ProductEventRules): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getProductEventRulesSnapshot(): ProductEventRules {
  hydrate();
  return state;
}

export function subscribeProductEventRules(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setProductEventRules(next: ProductEventRules): void {
  state = normalizeRules(next);
  persist(state);
  notify();
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
