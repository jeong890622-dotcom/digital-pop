"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AdminNavItem } from "../../_data/adminNavigation";
import {
  isPathAllowedForStore,
  MOCK_STORE_ADMIN_STORE_ID,
  navItemsForRole,
  normalizePath,
} from "../../_data/adminNavigation";
import type { AdminRole } from "../../_types/admin";
import { adminHref } from "./adminHref";
import { AdminAuthGate } from "./AdminAuthGate";
import { toResetPassword, useAdminAccountState } from "../../_lib/adminAccountStore";

function activeNavHref(pathname: string, items: AdminNavItem[]): string | null {
  const normalizedPath = normalizePath(pathname);
  let best: string | null = null;
  for (const item of items) {
    if (normalizedPath === item.href || normalizedPath.startsWith(`${item.href}/`)) {
      if (!best || item.href.length > best.length) {
        best = item.href;
      }
    }
  }
  return best;
}

export function AdminAppShell({ children }: { children: React.ReactNode }) {
  const pathname = normalizePath(usePathname() ?? "/admin");
  const router = useRouter();
  const [state, setState] = useAdminAccountState();
  const [nextPassword, setNextPassword] = useState("");
  const role: AdminRole = state.session?.role === "store" ? "store" : "master";
  const items = useMemo(() => navItemsForRole(role), [role]);
  const canAccess =
    role === "master" || isPathAllowedForStore(pathname);

  const currentActiveHref = useMemo(
    () => activeNavHref(pathname, items),
    [pathname, items],
  );

  const isPasswordChangeRequired = useMemo(() => {
    if (!state.session) {
      return false;
    }
    if (state.session.role === "master") {
      const account = state.masterAccounts.find((item) => item.id === state.session?.accountId);
      return Boolean(account?.mustChangePassword);
    }
    const account = state.storeAccounts.find((item) => item.id === state.session.accountId);
    return Boolean(account?.mustChangePassword);
  }, [state]);

  const logout = () => {
    setState({ ...state, session: null });
    router.replace("/admin");
  };

  const handleChangePassword = () => {
    if (!state.session) return;
    if (!nextPassword.trim()) return;

    if (state.session.role === "master") {
      const nextMasterAccounts = state.masterAccounts.map((account) =>
        account.id === state.session?.accountId
          ? { ...account, password: nextPassword, mustChangePassword: false }
          : account,
      );
      setState({ ...state, masterAccounts: nextMasterAccounts });
    } else {
      const nextStoreAccounts = state.storeAccounts.map((account) =>
        account.id === state.session?.accountId
          ? { ...account, password: nextPassword, mustChangePassword: false }
          : account,
      );
      setState({ ...state, storeAccounts: nextStoreAccounts });
    }
    setNextPassword("");
  };

  const setRoleMock = (next: AdminRole) => {
    if (!state.session) {
      return;
    }
    if (next === "store" && state.session.role !== "store") {
      return;
    }
    if (next === "master" && state.session.role !== "master") {
      return;
    }
    if (next === "store" && !isPathAllowedForStore(pathname)) {
      router.replace(`/admin/operations?storeId=${MOCK_STORE_ADMIN_STORE_ID}&tab=merchandising`);
      return;
    }
    router.replace(pathname);
  };

  if (!state.session) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] px-4 py-10">
        <AdminAuthGate />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] text-[#111111]">
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-52 shrink-0 flex-col border-r border-[#E5E5E5] bg-white">
          <div className="border-b border-[#E5E5E5] px-4 py-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#888888]">
              Admin
            </p>
            <p className="mt-1 text-sm font-semibold text-[#111111]">디지털 가격 POP</p>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3">
            {items.map((item) => {
              const active = item.href === currentActiveHref;
              return (
                <Link
                  key={`${role}-${item.href}`}
                  href={adminHref(item.href, role)}
                  className={`rounded-sm px-3 py-2 text-sm ${
                    active
                      ? "bg-[#F5F5F5] font-medium text-[#111111]"
                      : "text-[#666666] hover:bg-[#F5F5F5] hover:text-[#111111]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-[#E5E5E5] px-3 py-3 text-[11px] leading-snug text-[#888888]">
            mock: URL에 <code className="text-[#666666]">?role=store</code> 또는 헤더 전환
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5E5E5] bg-white px-6">
            <div className="min-w-0">
              <p className="text-xs text-[#888888]">관리자</p>
              <p className="truncate text-sm font-medium text-[#111111]">
                {state.session.role === "master"
                  ? (state.session.isSuper ? "총괄 마스터 관리자" : "마스터 관리자")
                  : "매장 관리자"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#888888]">역할(mock)</span>
              <div className="inline-flex rounded-sm border border-[#E5E5E5] p-0.5">
                <button
                  type="button"
                  onClick={() => setRoleMock("master")}
                  className={`rounded-sm px-2.5 py-1 text-xs ${
                    role === "master"
                      ? "bg-[#111111] text-white"
                      : "text-[#666666] hover:text-[#111111]"
                  }`}
                >
                  마스터
                </button>
                <button
                  type="button"
                  onClick={() => setRoleMock("store")}
                  disabled={state.session.role !== "store"}
                  className={`rounded-sm px-2.5 py-1 text-xs ${
                    role === "store"
                      ? "bg-[#111111] text-white"
                      : "text-[#666666] hover:text-[#111111]"
                  }`}
                >
                  매장
                </button>
              </div>
              <button
                type="button"
                onClick={logout}
                className="ml-2 text-xs text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
              >
                로그아웃
              </button>
              <Link
                href="/"
                className="ml-2 text-xs text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
              >
                고객 화면
              </Link>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-auto border-l border-[#E5E5E5] bg-white">
            {isPasswordChangeRequired ? (
              <div className="mx-auto mt-10 max-w-[560px] rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] p-4">
                <p className="text-sm font-medium text-[#111111]">비밀번호 변경이 필요합니다</p>
                <p className="mt-1 text-xs text-[#666666]">
                  초기화된 비밀번호({toResetPassword(
                    state.session.role === "master"
                      ? (state.masterAccounts.find((a) => a.id === state.session?.accountId)?.phone ?? "")
                      : (state.storeAccounts.find((a) => a.id === state.session?.accountId)?.phone ?? ""),
                  )})로 로그인한 경우 즉시 변경해야 합니다.
                </p>
                <input
                  type="password"
                  value={nextPassword}
                  onChange={(e) => setNextPassword(e.target.value)}
                  placeholder="새 비밀번호"
                  className="mt-3 w-full rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleChangePassword}
                  className="mt-3 rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white"
                >
                  비밀번호 변경
                </button>
              </div>
            ) : null}
            {canAccess ? (
              <div className="mx-auto max-w-[1200px] px-6 py-6">{isPasswordChangeRequired ? null : children}</div>
            ) : (
              <div className="mx-auto max-w-[1200px] px-6 py-16">
                <p className="text-sm font-medium text-[#111111]">접근할 수 없습니다</p>
                <p className="mt-2 text-sm text-[#666666]">
                  매장 관리자는 매장 운영 메뉴만 접근할 수 있습니다. 좌측 메뉴에서 허용된
                  항목만 표시됩니다.
                </p>
                <Link
                  href={adminHref(`/admin/operations?storeId=${MOCK_STORE_ADMIN_STORE_ID}&tab=merchandising`, "store")}
                  className="mt-6 inline-block text-sm text-[#111111] underline underline-offset-2"
                >
                  본인 매장 편성으로 이동
                </Link>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
