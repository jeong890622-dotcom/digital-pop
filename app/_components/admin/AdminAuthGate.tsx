"use client";

import { useMemo, useState } from "react";
import { useAdminAccountState, toResetPassword } from "../../_lib/adminAccountStore";

type AuthTab = "login" | "master-apply" | "store-apply";

export function AdminAuthGate() {
  const [state, setState] = useAdminAccountState();
  const [tab, setTab] = useState<AuthTab>("login");
  const [message, setMessage] = useState<string | null>(null);

  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [masterName, setMasterName] = useState("");
  const [masterTeam, setMasterTeam] = useState("");
  const [masterPhone, setMasterPhone] = useState("");
  const [masterId, setMasterId] = useState("");
  const [masterPw, setMasterPw] = useState("");

  const [storeName, setStoreName] = useState("");
  const [storeId, setStoreId] = useState(state.stores[0]?.id ?? "");
  const [storePhone, setStorePhone] = useState("");
  const [storeUserId, setStoreUserId] = useState("");
  const [storePw, setStorePw] = useState("");

  const usedIds = useMemo(
    () =>
      new Set(
        [
          ...state.masterAccounts.map((a) => a.username.toLowerCase()),
          ...state.storeAccounts.map((a) => a.username.toLowerCase()),
          ...state.masterApplications.map((a) => a.username.toLowerCase()),
          ...state.storeApplications.map((a) => a.username.toLowerCase()),
        ],
      ),
    [state],
  );

  const submitMasterApply = () => {
    if (!masterName.trim() || !masterTeam.trim() || !masterPhone.trim() || !masterId.trim() || !masterPw.trim()) {
      setMessage("모든 항목을 입력해 주세요.");
      return;
    }
    const key = masterId.trim().toLowerCase();
    if (usedIds.has(key)) {
      setMessage("이미 사용 중인 아이디입니다.");
      return;
    }
    setState({
      ...state,
      masterApplications: [
        {
          id: `mapp-${Date.now()}`,
          name: masterName.trim(),
          team: masterTeam.trim(),
          phone: masterPhone.trim(),
          username: masterId.trim(),
          password: masterPw,
          status: "PENDING",
          createdAt: new Date().toISOString(),
        },
        ...state.masterApplications,
      ],
    });
    setMasterName("");
    setMasterTeam("");
    setMasterPhone("");
    setMasterId("");
    setMasterPw("");
    setMessage("마스터 관리자 신청이 접수되었습니다. 승인 후 로그인 가능합니다.");
  };

  const submitStoreApply = () => {
    if (!storeName.trim() || !storeId || !storePhone.trim() || !storeUserId.trim() || !storePw.trim()) {
      setMessage("모든 항목을 입력해 주세요.");
      return;
    }
    const key = storeUserId.trim().toLowerCase();
    if (usedIds.has(key)) {
      setMessage("이미 사용 중인 아이디입니다.");
      return;
    }
    setState({
      ...state,
      storeApplications: [
        {
          id: `sapp-${Date.now()}`,
          name: storeName.trim(),
          storeId,
          phone: storePhone.trim(),
          username: storeUserId.trim(),
          password: storePw,
          status: "PENDING",
          createdAt: new Date().toISOString(),
        },
        ...state.storeApplications,
      ],
    });
    setStoreName("");
    setStorePhone("");
    setStoreUserId("");
    setStorePw("");
    setMessage("매장 관리자 신청이 접수되었습니다. 승인 후 로그인 가능합니다.");
  };

  const handleLogin = () => {
    const username = loginId.trim().toLowerCase();
    const password = loginPassword;
    if (!username || !password) {
      setMessage("아이디와 비밀번호를 입력해 주세요.");
      return;
    }

    const masterIndex = state.masterAccounts.findIndex((a) => a.username.toLowerCase() === username);
    if (masterIndex >= 0) {
      const target = state.masterAccounts[masterIndex]!;
      if (target.status === "LOCKED") {
        setMessage("잠긴 계정입니다. 총괄 관리자에게 잠금 해제를 요청해 주세요.");
        return;
      }
      if (target.password !== password) {
        const failedCount = target.failedCount + 1;
        const nextStatus = failedCount >= 10 ? "LOCKED" : target.status;
        const nextMasterAccounts = [...state.masterAccounts];
        nextMasterAccounts[masterIndex] = { ...target, failedCount, status: nextStatus };
        setState({ ...state, masterAccounts: nextMasterAccounts });
        setMessage(nextStatus === "LOCKED" ? "비밀번호 10회 오류로 계정이 잠겼습니다." : "로그인 정보가 올바르지 않습니다.");
        return;
      }
      const nextMasterAccounts = [...state.masterAccounts];
      nextMasterAccounts[masterIndex] = { ...target, failedCount: 0 };
      setState({
        ...state,
        masterAccounts: nextMasterAccounts,
        session: {
          role: "master",
          isSuper: target.isSuper,
          accountId: target.id,
          username: target.username,
        },
      });
      setMessage(null);
      return;
    }

    const storeIndex = state.storeAccounts.findIndex((a) => a.username.toLowerCase() === username);
    if (storeIndex >= 0) {
      const target = state.storeAccounts[storeIndex]!;
      if (target.status === "LOCKED") {
        setMessage("잠긴 계정입니다. 관리자에게 잠금 해제를 요청해 주세요.");
        return;
      }
      if (target.password !== password) {
        const failedCount = target.failedCount + 1;
        const nextStatus = failedCount >= 10 ? "LOCKED" : target.status;
        const nextStoreAccounts = [...state.storeAccounts];
        nextStoreAccounts[storeIndex] = { ...target, failedCount, status: nextStatus };
        setState({ ...state, storeAccounts: nextStoreAccounts });
        setMessage(nextStatus === "LOCKED" ? "비밀번호 10회 오류로 계정이 잠겼습니다." : "로그인 정보가 올바르지 않습니다.");
        return;
      }
      const nextStoreAccounts = [...state.storeAccounts];
      nextStoreAccounts[storeIndex] = { ...target, failedCount: 0 };
      setState({
        ...state,
        storeAccounts: nextStoreAccounts,
        session: {
          role: "store",
          storeId: target.storeId,
          accountId: target.id,
          username: target.username,
        },
      });
      setMessage(null);
      return;
    }

    setMessage("로그인 정보가 올바르지 않습니다.");
  };

  const changeTab = (nextTab: AuthTab) => {
    setTab(nextTab);
    setMessage(null);
  };

  return (
    <div className="mx-auto mt-14 w-full max-w-[760px] rounded-sm border border-[#E5E5E5] bg-white p-6">
      <h1 className="text-lg font-semibold text-[#111111]">관리자 로그인</h1>
      <p className="mt-1 text-sm text-[#666666]">
        승인된 계정만 관리자 페이지에 로그인할 수 있습니다.
      </p>
      <p className="mt-1 text-xs text-[#888888]">
        초기 총괄 계정: <code>supermaster / {toResetPassword("01012345678")}</code>
      </p>

      <div className="mt-4 flex gap-2 border-b border-[#E5E5E5] pb-3">
        {([
          ["login", "로그인"],
          ["master-apply", "마스터 관리자 신청"],
          ["store-apply", "매장 관리자 신청"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => changeTab(id)}
            className={`rounded-sm border px-3 py-1.5 text-xs ${
              tab === id
                ? "border-[#111111] bg-[#111111] text-white"
                : "border-[#E5E5E5] bg-white text-[#666666]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "login" ? (
        <div className="mt-4 grid gap-3">
          <input
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="아이디"
            className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="비밀번호"
            className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleLogin}
            className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white"
          >
            로그인
          </button>
        </div>
      ) : null}

      {tab === "master-apply" ? (
        <div className="mt-4 grid gap-3">
          <input value={masterName} onChange={(e) => setMasterName(e.target.value)} placeholder="이름" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <input value={masterTeam} onChange={(e) => setMasterTeam(e.target.value)} placeholder="소속팀" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <input value={masterPhone} onChange={(e) => setMasterPhone(e.target.value)} placeholder="핸드폰번호" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <input value={masterId} onChange={(e) => setMasterId(e.target.value)} placeholder="아이디" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <input type="password" value={masterPw} onChange={(e) => setMasterPw(e.target.value)} placeholder="비밀번호" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <button type="button" onClick={submitMasterApply} className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white">신청</button>
        </div>
      ) : null}

      {tab === "store-apply" ? (
        <div className="mt-4 grid gap-3">
          <input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="이름" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm">
            {state.stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <input value={storePhone} onChange={(e) => setStorePhone(e.target.value)} placeholder="핸드폰번호" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <input value={storeUserId} onChange={(e) => setStoreUserId(e.target.value)} placeholder="아이디" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <input type="password" value={storePw} onChange={(e) => setStorePw(e.target.value)} placeholder="비밀번호" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <button type="button" onClick={submitStoreApply} className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white">신청</button>
        </div>
      ) : null}

      {message ? <p className="mt-4 text-xs text-[#111111]">{message}</p> : null}
    </div>
  );
}
