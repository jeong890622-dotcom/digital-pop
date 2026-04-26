"use client";

import { useMemo, useState } from "react";
import { useAdminAccountState } from "../../_lib/adminAccountStore";

export default function MyAccountPage() {
  const [state, setState] = useAdminAccountState();
  const [message, setMessage] = useState<string | null>(null);

  const me = useMemo(() => {
    if (!state.session) {
      return null;
    }
    if (state.session.role === "master") {
      const account = state.masterAccounts.find((item) => item.id === state.session?.accountId);
      if (!account) return null;
      return {
        role: "master" as const,
        id: account.id,
        name: account.name,
        username: account.username,
        phone: account.phone,
        team: account.team,
        storeId: null,
        isSuper: account.isSuper,
        password: account.password,
      };
    }

    const account = state.storeAccounts.find((item) => item.id === state.session.accountId);
    if (!account) return null;
    return {
      role: "store" as const,
      id: account.id,
      name: account.name,
      username: account.username,
      phone: account.phone,
      team: null,
      storeId: account.storeId,
      isSuper: false,
      password: account.password,
    };
  }, [state]);

  const storeNameById = useMemo(
    () => new Map(state.stores.map((store) => [store.id, store.name])),
    [state.stores],
  );

  const [teamDraft, setTeamDraft] = useState(me?.team ?? "");
  const [phoneDraft, setPhoneDraft] = useState(me?.phone ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [nextPasswordConfirm, setNextPasswordConfirm] = useState("");

  const saveProfile = () => {
    if (!me) return;
    const normalizedPhone = phoneDraft.replace(/-/g, "").trim();
    if (!normalizedPhone) {
      setMessage("핸드폰번호를 입력해 주세요.");
      return;
    }
    if (!/^\d{10,11}$/.test(normalizedPhone)) {
      setMessage("핸드폰번호는 숫자만 10~11자리로 입력해 주세요.");
      return;
    }

    if (me.role === "master") {
      setState({
        ...state,
        masterAccounts: state.masterAccounts.map((account) =>
          account.id === me.id
            ? { ...account, phone: normalizedPhone, team: teamDraft.trim() || account.team }
            : account,
        ),
      });
    } else {
      setState({
        ...state,
        storeAccounts: state.storeAccounts.map((account) =>
          account.id === me.id ? { ...account, phone: normalizedPhone } : account,
        ),
      });
    }
    setMessage("내 정보가 저장되었습니다.");
  };

  const changePassword = () => {
    if (!me) return;
    if (!currentPassword || !nextPassword || !nextPasswordConfirm) {
      setMessage("비밀번호 변경 항목을 모두 입력해 주세요.");
      return;
    }
    if (currentPassword !== me.password) {
      setMessage("현재 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (nextPassword !== nextPasswordConfirm) {
      setMessage("신규 비밀번호와 확인값이 일치하지 않습니다.");
      return;
    }
    if (currentPassword === nextPassword) {
      setMessage("현재 비밀번호와 신규 비밀번호는 동일할 수 없습니다.");
      return;
    }

    if (me.role === "master") {
      setState({
        ...state,
        masterAccounts: state.masterAccounts.map((account) =>
          account.id === me.id
            ? { ...account, password: nextPassword, mustChangePassword: false }
            : account,
        ),
      });
    } else {
      setState({
        ...state,
        storeAccounts: state.storeAccounts.map((account) =>
          account.id === me.id
            ? { ...account, password: nextPassword, mustChangePassword: false }
            : account,
        ),
      });
    }
    setCurrentPassword("");
    setNextPassword("");
    setNextPasswordConfirm("");
    setMessage("비밀번호가 변경되었습니다.");
  };

  if (!me) {
    return null;
  }

  return (
    <section>
      <h1 className="text-lg font-semibold text-[#111111]">내 정보 관리</h1>
      <p className="mt-1 text-sm text-[#666666]">
        로그인한 본인 계정 정보만 수정할 수 있습니다.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-sm border border-[#E5E5E5] bg-white p-4">
          <h2 className="text-sm font-medium text-[#111111]">기본 정보</h2>
          <p className="mt-1 text-xs text-[#888888]">읽기전용 항목은 관리자 권한으로만 변경 가능합니다.</p>

          <div className="mt-4 grid gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">이름</label>
              <input value={me.name} disabled className="rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-1.5 text-sm text-[#666666]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">아이디</label>
              <input value={me.username} disabled className="rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-1.5 text-sm text-[#666666]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">역할</label>
              <input
                value={me.role === "master" ? (me.isSuper ? "총괄 마스터 관리자" : "마스터 관리자") : "매장 관리자"}
                disabled
                className="rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-1.5 text-sm text-[#666666]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">소속매장</label>
              <input
                value={me.storeId ? (storeNameById.get(me.storeId) ?? me.storeId) : "-"}
                disabled
                className="rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-1.5 text-sm text-[#666666]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">총괄 권한 여부</label>
              <input value={me.role === "master" ? (me.isSuper ? "Y" : "N") : "-"} disabled className="rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-1.5 text-sm text-[#666666]" />
            </div>
            {me.role === "master" ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#888888]">소속팀</label>
                <input value={teamDraft} onChange={(e) => setTeamDraft(e.target.value)} className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]" />
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">핸드폰번호</label>
              <input value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]" />
            </div>
            <button type="button" onClick={saveProfile} className="mt-1 w-fit rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white">
              기본 정보 저장
            </button>
          </div>
        </section>

        <section className="rounded-sm border border-[#E5E5E5] bg-white p-4">
          <h2 className="text-sm font-medium text-[#111111]">비밀번호 변경</h2>
          <p className="mt-1 text-xs text-[#888888]">
            현재 비밀번호 확인 후 새 비밀번호로 변경합니다.
          </p>
          <div className="mt-4 grid gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">현재 비밀번호</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">신규 비밀번호</label>
              <input type="password" value={nextPassword} onChange={(e) => setNextPassword(e.target.value)} className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">신규 비밀번호 확인</label>
              <input type="password" value={nextPasswordConfirm} onChange={(e) => setNextPasswordConfirm(e.target.value)} className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]" />
            </div>
            <button type="button" onClick={changePassword} className="mt-1 w-fit rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white">
              비밀번호 변경
            </button>
          </div>
        </section>
      </div>

      {message ? <p className="mt-4 text-xs text-[#111111]">{message}</p> : null}
    </section>
  );
}
