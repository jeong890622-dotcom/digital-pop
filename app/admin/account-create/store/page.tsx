"use client";

import { useMemo, useState } from "react";
import { toResetPassword, useAdminAccountState } from "../../../_lib/adminAccountStore";

export default function StoreAccountManagePage() {
  const [state, setState] = useAdminAccountState();
  const [rejectReason, setRejectReason] = useState("");
  const canApproveStoreApplications = state.session?.role === "master";
  const canManageStoreAccounts = state.session?.role === "master";

  const storeNameById = useMemo(
    () => new Map(state.stores.map((store) => [store.id, store.name])),
    [state.stores],
  );
  const pendingApplications = useMemo(
    () => state.storeApplications.filter((item) => item.status === "PENDING"),
    [state.storeApplications],
  );

  const approve = (applicationId: string) => {
    if (!canApproveStoreApplications) return;
    const application = state.storeApplications.find((item) => item.id === applicationId);
    if (!application) return;
    setState({
      ...state,
      storeApplications: state.storeApplications.filter((item) => item.id !== applicationId),
      storeAccounts: [
        {
          id: application.id.replace("sapp-", "sa-"),
          name: application.name,
          storeId: application.storeId,
          phone: application.phone,
          username: application.username,
          password: application.password,
          status: "ACTIVE",
          failedCount: 0,
          mustChangePassword: false,
        },
        ...state.storeAccounts,
      ],
    });
  };

  const reject = (applicationId: string) => {
    if (!canApproveStoreApplications) return;
    setState({
      ...state,
      storeApplications: state.storeApplications.map((item) =>
        item.id === applicationId
          ? { ...item, status: "REJECTED", rejectedReason: rejectReason.trim() || undefined }
          : item,
      ),
    });
    setRejectReason("");
  };

  const removeAccount = (accountId: string) => {
    if (!canManageStoreAccounts) return;
    setState({
      ...state,
      storeAccounts: state.storeAccounts.filter((item) => item.id !== accountId),
    });
  };

  const unlock = (accountId: string) => {
    if (!canManageStoreAccounts) return;
    setState({
      ...state,
      storeAccounts: state.storeAccounts.map((item) =>
        item.id === accountId ? { ...item, status: "ACTIVE", failedCount: 0 } : item,
      ),
    });
  };

  const resetPassword = (accountId: string) => {
    if (!canManageStoreAccounts) return;
    setState({
      ...state,
      storeAccounts: state.storeAccounts.map((item) =>
        item.id === accountId
          ? { ...item, password: toResetPassword(item.phone), mustChangePassword: true }
          : item,
      ),
    });
  };

  return (
    <section>
      <h1 className="text-lg font-semibold text-[#111111]">매장 관리자 계정 관리</h1>
      <p className="mt-1 text-sm text-[#666666]">
        신청 목록 승인/거부 및 매장 관리자 계정을 관리합니다.
      </p>

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
              {pendingApplications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-[#888888]">
                    승인 대기 중인 신청이 없습니다.
                  </td>
                </tr>
              ) : (
                pendingApplications.map((item) => (
                  <tr key={item.id} className="border-b border-[#E5E5E5] last:border-b-0">
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2">{storeNameById.get(item.storeId) ?? item.storeId}</td>
                    <td className="px-3 py-2">{item.phone}</td>
                    <td className="px-3 py-2">{item.username}</td>
                    <td className="px-3 py-2">PENDING</td>
                    <td className="px-3 py-2">
                      {canApproveStoreApplications ? (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => approve(item.id)} className="text-xs text-[#111111] underline">
                            승인
                          </button>
                          <button type="button" onClick={() => reject(item.id)} className="text-xs text-[#666666] underline">
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
        {canApproveStoreApplications ? (
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
              {state.storeAccounts.map((item) => (
                <tr key={item.id} className="border-b border-[#E5E5E5] last:border-b-0">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2">{storeNameById.get(item.storeId) ?? item.storeId}</td>
                  <td className="px-3 py-2">{item.username}</td>
                  <td className="px-3 py-2">{item.phone}</td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="px-3 py-2">
                    {canManageStoreAccounts ? (
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => resetPassword(item.id)} className="text-xs text-[#111111] underline">
                          비밀번호 초기화
                        </button>
                        <button type="button" onClick={() => unlock(item.id)} className="text-xs text-[#111111] underline">
                          잠금 해제
                        </button>
                        <button type="button" onClick={() => removeAccount(item.id)} className="text-xs text-[#666666] underline">
                          삭제
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#888888]">권한 없음</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
