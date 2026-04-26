"use client";

import { useMemo, useState } from "react";
import { toResetPassword, useAdminAccountState } from "../../../_lib/adminAccountStore";

export default function MasterAccountManagePage() {
  const [state, setState] = useAdminAccountState();
  const [rejectReason, setRejectReason] = useState("");
  const isSuper = state.session?.role === "master" && state.session.isSuper;

  const pendingApplications = useMemo(
    () => state.masterApplications.filter((item) => item.status === "PENDING"),
    [state.masterApplications],
  );

  const approve = (applicationId: string) => {
    if (!isSuper) return;
    const application = state.masterApplications.find((item) => item.id === applicationId);
    if (!application) return;
    const nextApplications = state.masterApplications.filter((item) => item.id !== applicationId);
    setState({
      ...state,
      masterApplications: nextApplications,
      masterAccounts: [
        {
          id: application.id.replace("mapp-", "ma-"),
          name: application.name,
          team: application.team,
          phone: application.phone,
          username: application.username,
          password: application.password,
          status: "ACTIVE",
          isSuper: false,
          failedCount: 0,
          mustChangePassword: false,
        },
        ...state.masterAccounts,
      ],
    });
  };

  const reject = (applicationId: string) => {
    if (!isSuper) return;
    setState({
      ...state,
      masterApplications: state.masterApplications.map((item) =>
        item.id === applicationId
          ? { ...item, status: "REJECTED", rejectedReason: rejectReason.trim() || undefined }
          : item,
      ),
    });
    setRejectReason("");
  };

  const removeAccount = (accountId: string) => {
    if (!isSuper) return;
    setState({
      ...state,
      masterAccounts: state.masterAccounts.filter((item) => item.id !== accountId),
    });
  };

  const unlock = (accountId: string) => {
    if (!isSuper) return;
    setState({
      ...state,
      masterAccounts: state.masterAccounts.map((item) =>
        item.id === accountId ? { ...item, status: "ACTIVE", failedCount: 0 } : item,
      ),
    });
  };

  const resetPassword = (accountId: string) => {
    if (!isSuper) return;
    setState({
      ...state,
      masterAccounts: state.masterAccounts.map((item) =>
        item.id === accountId
          ? { ...item, password: toResetPassword(item.phone), mustChangePassword: true }
          : item,
      ),
    });
  };

  const toggleSuper = (accountId: string) => {
    if (!isSuper) return;
    setState({
      ...state,
      masterAccounts: state.masterAccounts.map((item) =>
        item.id === accountId ? { ...item, isSuper: !item.isSuper } : item,
      ),
    });
  };

  return (
    <section>
      <h1 className="text-lg font-semibold text-[#111111]">마스터 관리자 계정 관리</h1>
      <p className="mt-1 text-sm text-[#666666]">
        신청 목록 승인/거부 및 마스터 관리자 계정을 관리합니다.
      </p>

      <div className="mt-5 rounded-sm border border-[#E5E5E5] bg-white">
        <div className="border-b border-[#E5E5E5] px-4 py-3">
          <p className="text-sm font-medium text-[#111111]">신청 목록 (마스터 관리자)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#F5F5F5]">
                <th className="px-3 py-2 text-xs text-[#666666]">이름</th>
                <th className="px-3 py-2 text-xs text-[#666666]">소속팀</th>
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
                    <td className="px-3 py-2">{item.team}</td>
                    <td className="px-3 py-2">{item.phone}</td>
                    <td className="px-3 py-2">{item.username}</td>
                    <td className="px-3 py-2">PENDING</td>
                    <td className="px-3 py-2">
                      {isSuper ? (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => approve(item.id)} className="text-xs text-[#111111] underline">
                            승인
                          </button>
                          <button type="button" onClick={() => reject(item.id)} className="text-xs text-[#666666] underline">
                            거부
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#888888]">조회만 가능</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {isSuper ? (
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
                <th className="px-3 py-2 text-xs text-[#666666]">소속팀</th>
                <th className="px-3 py-2 text-xs text-[#666666]">아이디</th>
                <th className="px-3 py-2 text-xs text-[#666666]">핸드폰</th>
                <th className="px-3 py-2 text-xs text-[#666666]">권한</th>
                <th className="px-3 py-2 text-xs text-[#666666]">상태</th>
                <th className="px-3 py-2 text-xs text-[#666666]">관리</th>
              </tr>
            </thead>
            <tbody>
              {state.masterAccounts.map((item) => (
                <tr key={item.id} className="border-b border-[#E5E5E5] last:border-b-0">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2">{item.team}</td>
                  <td className="px-3 py-2">{item.username}</td>
                  <td className="px-3 py-2">{item.phone}</td>
                  <td className="px-3 py-2">{item.isSuper ? "총괄" : "마스터"}</td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="px-3 py-2">
                    {isSuper ? (
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => resetPassword(item.id)} className="text-xs text-[#111111] underline">
                          비밀번호 초기화
                        </button>
                        <button type="button" onClick={() => unlock(item.id)} className="text-xs text-[#111111] underline">
                          잠금 해제
                        </button>
                        <button type="button" onClick={() => toggleSuper(item.id)} className="text-xs text-[#111111] underline">
                          총괄 권한 {item.isSuper ? "회수" : "부여"}
                        </button>
                        <button type="button" onClick={() => removeAccount(item.id)} className="text-xs text-[#666666] underline">
                          삭제
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#888888]">조회만 가능</span>
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
