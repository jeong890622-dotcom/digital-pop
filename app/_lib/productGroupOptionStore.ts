"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { ProductGroupOptionRule } from "../_types/productGroupOption";
import {
  fetchAllProductGroupOptions,
  replaceAllProductGroupOptions,
} from "./supabaseProductGroups";

const DEFAULT_RULES: ProductGroupOptionRule[] = [];

let state: ProductGroupOptionRule[] = DEFAULT_RULES;
const listeners = new Set<() => void>();
let hydrated = false;
let hydrationInFlight: Promise<void> | null = null;
let lastSyncError: string | null = null;

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
  if (hydrated || hydrationInFlight) return;
  if (typeof window === "undefined") return;
  hydrationInFlight = (async () => {
    try {
      const remote = await fetchAllProductGroupOptions();
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

export function getProductGroupOptionRulesSnapshot(): ProductGroupOptionRule[] {
  hydrate();
  return state;
}

export function subscribeProductGroupOptionRules(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getProductGroupOptionRulesLastSyncError(): string | null {
  return lastSyncError;
}

export async function reloadProductGroupOptionRules(): Promise<void> {
  const remote = await fetchAllProductGroupOptions();
  state = normalizeRules(remote);
  hydrated = true;
  notify();
}

export function setProductGroupOptionRules(next: ProductGroupOptionRule[]): void {
  state = normalizeRules(next);
  hydrated = true;
  notify();
  void (async () => {
    const result = await replaceAllProductGroupOptions(state);
    if (!result.ok) {
      lastSyncError = result.message;
      if (typeof window !== "undefined") {
        window.alert(
          `상품군 옵션 저장에 실패했습니다.\n${result.message}\n페이지를 새로고침한 뒤 다시 시도해 주세요.`,
        );
      }
      return;
    }
    lastSyncError = null;
  })();
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
