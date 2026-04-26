"use client";

import { useMemo, useSyncExternalStore } from "react";
import { MOCK_STORES, type MockStore } from "../_data/adminNavigation";

export type AccountStatus = "PENDING" | "ACTIVE" | "REJECTED" | "LOCKED";

export type MasterApplication = {
  id: string;
  name: string;
  team: string;
  phone: string;
  username: string;
  password: string;
  status: Extract<AccountStatus, "PENDING" | "REJECTED">;
  rejectedReason?: string;
  createdAt: string;
};

export type StoreApplication = {
  id: string;
  name: string;
  storeId: string;
  phone: string;
  username: string;
  password: string;
  status: Extract<AccountStatus, "PENDING" | "REJECTED">;
  rejectedReason?: string;
  createdAt: string;
};

export type MasterAccount = {
  id: string;
  name: string;
  team: string;
  phone: string;
  username: string;
  password: string;
  status: Extract<AccountStatus, "ACTIVE" | "LOCKED">;
  isSuper: boolean;
  failedCount: number;
  mustChangePassword: boolean;
};

export type StoreAccount = {
  id: string;
  name: string;
  storeId: string;
  phone: string;
  username: string;
  password: string;
  status: Extract<AccountStatus, "ACTIVE" | "LOCKED">;
  failedCount: number;
  mustChangePassword: boolean;
};

export type AdminSession =
  | {
      role: "master";
      isSuper: boolean;
      accountId: string;
      username: string;
    }
  | {
      role: "store";
      storeId: string;
      accountId: string;
      username: string;
    };

export type AdminAccountState = {
  stores: MockStore[];
  masterApplications: MasterApplication[];
  storeApplications: StoreApplication[];
  masterAccounts: MasterAccount[];
  storeAccounts: StoreAccount[];
  session: AdminSession | null;
};

const STORAGE_KEY = "digital-pop:admin-account-state";

const INITIAL_STATE: AdminAccountState = {
  stores: MOCK_STORES,
  masterApplications: [],
  storeApplications: [],
  masterAccounts: [
    {
      id: "ma-001",
      name: "총괄 관리자",
      team: "Digital POP TF",
      phone: "01012345678",
      username: "supermaster",
      password: "01012345678@",
      status: "ACTIVE",
      isSuper: true,
      failedCount: 0,
      mustChangePassword: false,
    },
  ],
  storeAccounts: [],
  session: null,
};

let state: AdminAccountState = INITIAL_STATE;
const listeners = new Set<() => void>();
let hydrated = false;

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function persist(nextState: AdminAccountState): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function normalizeStores(raw: unknown): MockStore[] {
  if (!Array.isArray(raw)) {
    return MOCK_STORES;
  }
  const parsed = raw
    .map((item) => ({
      id: typeof item?.id === "string" ? item.id : "",
      code: typeof item?.code === "string" ? item.code : "",
      name: typeof item?.name === "string" ? item.name : "",
    }))
    .filter((item) => item.id && item.code && item.name);
  return parsed.length > 0 ? parsed : MOCK_STORES;
}

function hydrate(): void {
  if (hydrated || typeof window === "undefined") {
    return;
  }
  hydrated = true;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AdminAccountState>;
    state = {
      stores: normalizeStores(parsed.stores),
      masterApplications: Array.isArray(parsed.masterApplications) ? parsed.masterApplications : [],
      storeApplications: Array.isArray(parsed.storeApplications) ? parsed.storeApplications : [],
      masterAccounts: Array.isArray(parsed.masterAccounts) ? parsed.masterAccounts : INITIAL_STATE.masterAccounts,
      storeAccounts: Array.isArray(parsed.storeAccounts) ? parsed.storeAccounts : [],
      session: parsed.session ?? null,
    };
    persist(state);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function getAdminAccountStateSnapshot(): AdminAccountState {
  hydrate();
  return state;
}

export function subscribeAdminAccountState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAdminAccountState(nextState: AdminAccountState): void {
  state = nextState;
  persist(nextState);
  notify();
}

export function useAdminAccountState(): [
  AdminAccountState,
  (nextState: AdminAccountState) => void,
] {
  const snapshot = useSyncExternalStore(
    subscribeAdminAccountState,
    getAdminAccountStateSnapshot,
    () => INITIAL_STATE,
  );
  const setState = useMemo(
    () => (nextState: AdminAccountState) => setAdminAccountState(nextState),
    [],
  );
  return [snapshot, setState];
}

export function toResetPassword(phone: string): string {
  return `${phone}@`;
}
