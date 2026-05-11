"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { ProductGroupOptionRule } from "../_types/productGroupOption";

const STORAGE_KEY = "digital-pop:product-group-option-rules";

const DEFAULT_RULES: ProductGroupOptionRule[] = [];

let state: ProductGroupOptionRule[] = DEFAULT_RULES;
const listeners = new Set<() => void>();
let hydrated = false;

function normalizeRules(raw: unknown): ProductGroupOptionRule[] {
  if (!Array.isArray(raw)) return [];
  const map = new Map<string, ProductGroupOptionRule>();
  for (const item of raw) {
    const candidate = item as Partial<ProductGroupOptionRule>;
    const id = String(candidate.id ?? "").trim();
    const groupName = String(candidate.groupName ?? "").trim();
    const sizeLabel = String(candidate.sizeLabel ?? "Standard").trim() || "Standard";
    const optionName = String(candidate.optionName ?? "").trim();
    const linkedProductCode = String(candidate.linkedProductCode ?? "").trim();
    if (!id || !groupName || !sizeLabel || !optionName || !linkedProductCode) {
      continue;
    }
    map.set(id, {
      id,
      groupName,
      sizeLabel,
      optionName,
      linkedProductCode,
      sortOrder:
        typeof candidate.sortOrder === "number" && Number.isFinite(candidate.sortOrder)
          ? candidate.sortOrder
          : 0,
      isActive: candidate.isActive !== false,
    });
  }
  return [...map.values()].sort((a, b) => {
    if (a.groupName !== b.groupName) return a.groupName.localeCompare(b.groupName);
    if (a.sizeLabel !== b.sizeLabel) return a.sizeLabel.localeCompare(b.sizeLabel);
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.optionName.localeCompare(b.optionName);
  });
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
    const parsed = JSON.parse(raw);
    state = normalizeRules(parsed);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function persist(next: ProductGroupOptionRule[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getProductGroupOptionRulesSnapshot(): ProductGroupOptionRule[] {
  hydrate();
  return state;
}

export function subscribeProductGroupOptionRules(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setProductGroupOptionRules(next: ProductGroupOptionRule[]): void {
  state = normalizeRules(next);
  persist(state);
  notify();
}

export function useProductGroupOptionRules(): [
  ProductGroupOptionRule[],
  (next: ProductGroupOptionRule[]) => void,
] {
  const rules = useSyncExternalStore(
    subscribeProductGroupOptionRules,
    getProductGroupOptionRulesSnapshot,
    () => DEFAULT_RULES,
  );
  const setRules = useMemo(
    () => (next: ProductGroupOptionRule[]) => setProductGroupOptionRules(next),
    [],
  );
  return [rules, setRules];
}

