"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  fetchAllStoreZoneQrs,
  replaceAllStoreZoneQrs,
  type ZoneQrByStore,
  type ZoneQrEntry,
} from "./supabaseStoreOperations";

export type { ZoneQrByStore, ZoneQrEntry } from "./supabaseStoreOperations";

const EMPTY_BY_STORE: ZoneQrByStore = {};

let state: ZoneQrByStore = {};
const listeners = new Set<() => void>();
let hydrated = false;
let hydrationInFlight: Promise<void> | null = null;
let lastSyncError: string | null = null;

function normalizeEntry(entry: ZoneQrEntry): ZoneQrEntry {
  const history = Array.isArray(entry.qrUrlHistory)
    ? entry.qrUrlHistory.map((url) => String(url ?? "").trim()).filter(Boolean)
    : [];
  return {
    storeId: (entry.storeId ?? "").trim(),
    zone: (entry.zone ?? "").trim(),
    zoneId: (entry.zoneId ?? "").trim(),
    qrId: (entry.qrId ?? "").trim(),
    qrUrl: (entry.qrUrl ?? "").trim(),
    qrImageUrl: (entry.qrImageUrl ?? "").trim(),
    generatedAt: entry.generatedAt || new Date().toISOString(),
    qrUrlHistory: history,
  };
}

function normalize(input: ZoneQrByStore): ZoneQrByStore {
  const normalized: ZoneQrByStore = {};
  for (const [storeId, byZone] of Object.entries(input ?? {})) {
    if (!byZone || typeof byZone !== "object") continue;
    const slot: Record<string, ZoneQrEntry> = {};
    for (const [zoneId, entry] of Object.entries(byZone)) {
      if (!entry) continue;
      const normalizedEntry = normalizeEntry({
        ...entry,
        storeId: entry.storeId || storeId,
        zoneId: entry.zoneId || zoneId,
      });
      if (!normalizedEntry.storeId || !normalizedEntry.zoneId) continue;
      slot[zoneId] = normalizedEntry;
    }
    normalized[storeId] = slot;
  }
  return normalized;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function hydrate(): void {
  if (hydrated || hydrationInFlight) return;
  if (typeof window === "undefined") return;
  hydrationInFlight = (async () => {
    try {
      const remote = await fetchAllStoreZoneQrs();
      state = normalize(remote);
    } catch {
      // 네트워크 실패 시 빈 상태 유지
    } finally {
      hydrated = true;
      hydrationInFlight = null;
      notify();
    }
  })();
}

export function getStoreZoneQrsSnapshot(): ZoneQrByStore {
  hydrate();
  return state;
}

export function subscribeStoreZoneQrs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStoreZoneQrsLastSyncError(): string | null {
  return lastSyncError;
}

export async function reloadStoreZoneQrs(): Promise<void> {
  const remote = await fetchAllStoreZoneQrs();
  state = normalize(remote);
  hydrated = true;
  notify();
}

type SetterArg = ZoneQrByStore | ((prev: ZoneQrByStore) => ZoneQrByStore);

export function setStoreZoneQrs(updater: SetterArg): void {
  const next =
    typeof updater === "function"
      ? (updater as (prev: ZoneQrByStore) => ZoneQrByStore)(state)
      : updater;
  state = normalize(next);
  hydrated = true;
  notify();
  void (async () => {
    const result = await replaceAllStoreZoneQrs(state);
    if (!result.ok) {
      lastSyncError = result.message;
      if (typeof window !== "undefined") {
        window.alert(
          `매장 QR 저장에 실패했습니다.\n${result.message}\n페이지를 새로고침한 뒤 다시 시도해 주세요.`,
        );
      }
      return;
    }
    lastSyncError = null;
  })();
}

export function useStoreZoneQrs(): [ZoneQrByStore, (updater: SetterArg) => void] {
  const value = useSyncExternalStore(
    subscribeStoreZoneQrs,
    getStoreZoneQrsSnapshot,
    () => EMPTY_BY_STORE,
  );
  const setter = useMemo(() => (updater: SetterArg) => setStoreZoneQrs(updater), []);
  return [value, setter];
}
