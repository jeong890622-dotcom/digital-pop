"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAccountState } from "../../../_lib/adminAccountStore";
import {
  approveAdminProfile,
  deleteAdminProfile,
  fetchAdminProfilesByRole,
  fetchStores,
  lockAdminProfile,
  rejectAdminProfile,
  unlockAdminProfile,
  type AdminProfileRow,
  type StoreRow,
} from "../../../_lib/supabaseAdmin";

export default function StoreAccountManagePage() {
  const [state] = useAdminAccountState();
  const [rows, setRows] = useState<AdminProfileRow[]>([]);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManage = state.session?.role === "master";

  const reload = useCallback(async () => {
    setLoading(true);
    const [profiles, storeList] = await Promise.all([
      fetchAdminProfilesByRole("store"),
      fetchStores(),
    ]);
    setRows(profiles);
    setStores(storeList);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const storeNameById = useMemo(
    () => new Map(stores.map((store) => [store.id, store.name])),
    [stores],
  );
  const pendingApplications = useMemo(
    () => rows.filter((item) => item.status === "PENDING"),
    [rows],
  );
  const activeAccounts = useMemo(
    () => rows.filter((item) => item.status === "ACTIVE" || item.status === "LOCKED"),
    [rows],
  );

  const runAction = async (
    id: string,
    label: string,
    action: () => Promise<boolean>,
  ) => {
    if (!canManage) return;
    setActionError(null);
    setBusyId(id);
    try {
      const ok = await action();
      if (!ok) {
        setActionError(`${label} 처리 중 오류가 발생했습니다. 권한 또는 네트워크를 확인해 주세요.`);
        return;
      }
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const approve = (id: string) => runAction(id, "승인", () => approveAdminProfile(id));
  const reject = (id: string) => {
    const reason = rejectReason.trim() || null;
    return runAction(id, "거부", async () => {
      const ok = await rejectAdminProfile(id, reason);
      if (ok) setRejectReason("");
      return ok;
    });
  };
  const unlock = (id: string) => runAction(id, "잠금 해제", () => unlockAdminProfile(id));
  const lock = (id: string) => runAction(id, "잠금", () => lockAdminProfile(id));
  const removeAccount = (id: string) =>
    runAction(id, "삭제", () => deleteAdminProfile(id));

  return (
    <section>
      <h1 className="text-lg font-semibold text-[#111111]">매장 관리자 계정 관리</h1>
      <p className="mt-1 text-sm text-[#666666]">
        신청 목록 승인/거부 및 매장 관리자 계정을 관리합니다.
      </p>
      {!canManage ? (
        <p className="mt-2 text-xs text-[#888888]">
          마스터 관리자 권한이 있어야 매장 계정을 관리할 수 있습니다.
        </p>
      ) : null}
      {actionError ? (
        <p className="mt-2 text-xs text-[#B00020]">{actionError}</p>
      ) : null}

      <div className="mt-5 rounded-sm border border-[#E5E5E5] bg-white">
        <div className="border-b border-[#E5E5E5] px-4 py-3">
          <p className="text-sm font-medium text-[#111111]">신청 목록 (매장 관리자)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#F5F5F5]">
                <th className="px-3 py-2 text-xs text-[#666666]">이름</th>
                <th className="px-3 py-2 text-xs text-[#666666]">소속매장</th>
                <th className="px-3 py-2 text-xs text-[#666666]">핸드폰</th>
                <th className="px-3 py-2 text-xs text-[#666666]">아이디</th>
                <th className="px-3 py-2 text-xs text-[#666666]">상태</th>
                <th className="px-3 py-2 text-xs text-[#666666]">관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-[#888888]">
                    불러오는 중…
                  </td>
                </tr>
              ) : pendingApplications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-[#888888]">
                    승인 대기 중인 신청이 없습니다.
                  </td>
                </tr>
              ) : (
                pendingApplications.map((item) => (
                  <tr key={item.id} className="border-b border-[#E5E5E5] last:border-b-0">
                    <td className="px-3 py-2">{item.name ?? "-"}</td>
                    <td className="px-3 py-2">
                      {item.store_id ? storeNameById.get(item.store_id) ?? item.store_id : "-"}
                    </td>
                    <td className="px-3 py-2">{item.phone ?? "-"}</td>
                    <td className="px-3 py-2">{item.username}</td>
                    <td className="px-3 py-2">PENDING</td>
                    <td className="px-3 py-2">
                      {canManage ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => approve(item.id)}
                            disabled={busyId === item.id}
                            className="text-xs text-[#111111] underline disabled:opacity-50"
                          >
                            승인
                          </button>
                          <button
                            type="button"
                            onClick={() => reject(item.id)}
                            disabled={busyId === item.id}
                            className="text-xs text-[#666666] underline disabled:opacity-50"
                          >
                            거부
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#888888]">권한 없음</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {canManage ? (
          <div className="border-t border-[#E5E5E5] px-4 py-3">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거부 사유 (선택)"
              className="w-full max-w-sm rounded-sm border border-[#E5E5E5] px-2 py-1.5 text-xs"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-5 rounded-sm border border-[#E5E5E5] bg-white">
        <div className="border-b border-[#E5E5E5] px-4 py-3">
          <p className="text-sm font-medium text-[#111111]">등록 계정 목록</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#F5F5F5]">
                <th className="px-3 py-2 text-xs text-[#666666]">이름</th>
                <th className="px-3 py-2 text-xs text-[#666666]">소속매장</th>
                <th className="px-3 py-2 text-xs text-[#666666]">아이디</th>
                <th className="px-3 py-2 text-xs text-[#666666]">핸드폰</th>
                <th className="px-3 py-2 text-xs text-[#666666]">상태</th>
                <th className="px-3 py-2 text-xs text-[#666666]">관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-[#888888]">
                    불러오는 중…
                  </td>
                </tr>
              ) : activeAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-[#888888]">
                    등록된 매장 관리자 계정이 없습니다.
                  </td>
                </tr>
              ) : (
                activeAccounts.map((item) => (
                  <tr key={item.id} className="border-b border-[#E5E5E5] last:border-b-0">
                    <td className="px-3 py-2">{item.name ?? "-"}</td>
                    <td className="px-3 py-2">
                      {item.store_id ? storeNameById.get(item.store_id) ?? item.store_id : "-"}
                    </td>
                    <td className="px-3 py-2">{item.username}</td>
                    <td className="px-3 py-2">{item.phone ?? "-"}</td>
                    <td className="px-3 py-2">{item.status}</td>
                    <td className="px-3 py-2">
                      {canManage ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {item.status === "LOCKED" ? (
                            <button
                              type="button"
                              onClick={() => unlock(item.id)}
                              disabled={busyId === item.id}
                              className="text-xs text-[#111111] underline disabled:opacity-50"
                            >
                              잠금 해제
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => lock(item.id)}
                              disabled={busyId === item.id}
                              className="text-xs text-[#666666] underline disabled:opacity-50"
                            >
                              잠금
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeAccount(item.id)}
                            disabled={busyId === item.id}
                            className="text-xs text-[#666666] underline disabled:opacity-50"
                          >
                            삭제
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#888888]">권한 없음</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[#E5E5E5] px-4 py-3 text-[11px] text-[#888888]">
          비밀번호 분실 시에는 “삭제” 후 재신청을 안내해 주세요. (현 단계에서는 비밀번호 초기화 기능을 제공하지 않습니다.)
        </div>
      </div>
    </section>
  );
}
