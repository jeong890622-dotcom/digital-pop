"use client";

import { useEffect, useState } from "react";
import { useAdminAccountState, type AdminSession } from "../../_lib/adminAccountStore";
import { enableSupabaseAuthAutoRefresh, getSupabaseClient } from "../../_lib/supabase";
import {
  fetchStores,
  signUpAdminApplicant,
  usernameToEmail,
  type AdminProfileRow,
  type StoreRow,
} from "../../_lib/supabaseAdmin";

function adminSessionFromProfile(profile: AdminProfileRow): AdminSession {
  if (profile.role === "master") {
    return {
      role: "master",
      isSuper: profile.is_super,
      accountId: profile.id,
      username: profile.username,
    };
  }
  return {
    role: "store",
    storeId: profile.store_id ?? "",
    accountId: profile.id,
    username: profile.username,
  };
}

type AuthTab = "login" | "master-apply" | "store-apply";

export function AdminAuthGate() {
  const [state, setState] = useAdminAccountState();
  const [tab, setTab] = useState<AuthTab>("login");
  const [message, setMessage] = useState<string | null>(null);

  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [masterName, setMasterName] = useState("");
  const [masterTeam, setMasterTeam] = useState("");
  const [masterPhone, setMasterPhone] = useState("");
  const [masterId, setMasterId] = useState("");
  const [masterPw, setMasterPw] = useState("");
  const [isMasterApplying, setIsMasterApplying] = useState(false);

  const [stores, setStores] = useState<StoreRow[]>([]);
  const [storeName, setStoreName] = useState("");
  const [storeId, setStoreId] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeUserId, setStoreUserId] = useState("");
  const [storePw, setStorePw] = useState("");
  const [isStoreApplying, setIsStoreApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await fetchStores();
      if (cancelled) return;
      setStores(list);
      if (list.length > 0) {
        setStoreId((prev) => (prev && list.some((s) => s.id === prev) ? prev : list[0]!.id));
      } else {
        setStoreId("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetMasterForm = () => {
    setMasterName("");
    setMasterTeam("");
    setMasterPhone("");
    setMasterId("");
    setMasterPw("");
  };

  const resetStoreForm = () => {
    setStoreName("");
    setStorePhone("");
    setStoreUserId("");
    setStorePw("");
  };

  const submitMasterApply = async () => {
    if (
      !masterName.trim() ||
      !masterTeam.trim() ||
      !masterPhone.trim() ||
      !masterId.trim() ||
      !masterPw.trim()
    ) {
      setMessage("모든 항목을 입력해 주세요.");
      return;
    }
    if (masterPw.length < 6) {
      setMessage("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setIsMasterApplying(true);
    try {
      const result = await signUpAdminApplicant({
        username: masterId,
        password: masterPw,
        role: "master",
        name: masterName,
        phone: masterPhone,
        team: masterTeam,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      resetMasterForm();
      setMessage("마스터 관리자 신청이 접수되었습니다. 승인 후 로그인 가능합니다.");
    } finally {
      setIsMasterApplying(false);
    }
  };

  const submitStoreApply = async () => {
    if (
      !storeName.trim() ||
      !storeId ||
      !storePhone.trim() ||
      !storeUserId.trim() ||
      !storePw.trim()
    ) {
      setMessage("모든 항목을 입력해 주세요.");
      return;
    }
    if (storePw.length < 6) {
      setMessage("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setIsStoreApplying(true);
    try {
      const result = await signUpAdminApplicant({
        username: storeUserId,
        password: storePw,
        role: "store",
        name: storeName,
        phone: storePhone,
        storeId,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      resetStoreForm();
      setMessage("매장 관리자 신청이 접수되었습니다. 승인 후 로그인 가능합니다.");
    } finally {
      setIsStoreApplying(false);
    }
  };

  const handleLogin = async () => {
    const username = loginId.trim().toLowerCase();
    const password = loginPassword;
    if (!username || !password) {
      setMessage("아이디와 비밀번호를 입력해 주세요.");
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setMessage("로그인 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const email = usernameToEmail(username);
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError || !signInData.user) {
        const errMsg = (signInError?.message ?? "").toLowerCase();
        if (
          errMsg.includes("failed to fetch") ||
          errMsg.includes("network") ||
          errMsg.includes("fetch failed")
        ) {
          setMessage(
            "로그인 서버(Supabase)에 연결할 수 없습니다. 프로젝트가 일시 중지(Paused)되었는지 대시보드에서 Resume project를 확인해 주세요.",
          );
          return;
        }
        setMessage("로그인 정보가 올바르지 않습니다.");
        return;
      }

      const { data: profile, error: profileError } = await client
        .from("admin_profiles")
        .select("id, role, username, name, phone, team, is_super, store_id, status, rejected_reason, created_at")
        .eq("id", signInData.user.id)
        .single<AdminProfileRow>();

      if (profileError || !profile) {
        await client.auth.signOut();
        setMessage("계정 정보를 불러올 수 없습니다. 관리자에게 문의해 주세요.");
        return;
      }

      if (profile.status === "LOCKED") {
        await client.auth.signOut();
        setMessage("잠긴 계정입니다. 총괄 관리자에게 잠금 해제를 요청해 주세요.");
        return;
      }
      if (profile.status === "REJECTED") {
        await client.auth.signOut();
        setMessage("계정 신청이 거절되었습니다. 사유는 관리자에게 문의해 주세요.");
        return;
      }
      if (profile.status === "PENDING") {
        await client.auth.signOut();
        setMessage("승인 대기 중인 계정입니다. 승인 후 로그인할 수 있습니다.");
        return;
      }

      setState({ ...state, session: adminSessionFromProfile(profile) });
      enableSupabaseAuthAutoRefresh(client);
      setMessage(null);
    } catch (err) {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
      if (
        msg.includes("failed to fetch") ||
        msg.includes("network") ||
        msg.includes("fetch failed")
      ) {
        setMessage(
          "로그인 서버(Supabase)에 연결할 수 없습니다. 프로젝트가 일시 중지(Paused)되었는지 대시보드에서 Resume project를 확인해 주세요.",
        );
      } else {
        setMessage("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setIsLoggingIn(false);
    }
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
        승인된 아이디·비밀번호로 로그인하세요. 신청 후에는 총괄 관리자 승인이 필요합니다.
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
            disabled={isLoggingIn}
            className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {isLoggingIn ? "로그인 중…" : "로그인"}
          </button>
        </div>
      ) : null}

      {tab === "master-apply" ? (
        <div className="mt-4 grid gap-3">
          <input value={masterName} onChange={(e) => setMasterName(e.target.value)} placeholder="이름" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <input value={masterTeam} onChange={(e) => setMasterTeam(e.target.value)} placeholder="소속팀" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <input value={masterPhone} onChange={(e) => setMasterPhone(e.target.value)} placeholder="핸드폰번호" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <input value={masterId} onChange={(e) => setMasterId(e.target.value)} placeholder="아이디 (영문/숫자)" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <input type="password" value={masterPw} onChange={(e) => setMasterPw(e.target.value)} placeholder="비밀번호 (6자 이상)" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <button
            type="button"
            onClick={submitMasterApply}
            disabled={isMasterApplying}
            className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {isMasterApplying ? "신청 중…" : "신청"}
          </button>
        </div>
      ) : null}

      {tab === "store-apply" ? (
        <div className="mt-4 grid gap-3">
          <input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="이름" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          {stores.length === 0 ? (
            <div className="rounded-sm border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2 text-xs text-[#666666]">
              등록된 매장이 없습니다. 마스터 관리자에게 매장 등록을 요청해 주세요.
            </div>
          ) : (
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          )}
          <input value={storePhone} onChange={(e) => setStorePhone(e.target.value)} placeholder="핸드폰번호" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <input value={storeUserId} onChange={(e) => setStoreUserId(e.target.value)} placeholder="아이디 (영문/숫자)" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <input type="password" value={storePw} onChange={(e) => setStorePw(e.target.value)} placeholder="비밀번호 (6자 이상)" className="rounded-sm border border-[#E5E5E5] px-3 py-2 text-sm" />
          <button
            type="button"
            onClick={submitStoreApply}
            disabled={isStoreApplying || stores.length === 0}
            className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {isStoreApplying ? "신청 중…" : "신청"}
          </button>
        </div>
      ) : null}

      {message ? <p className="mt-4 text-xs text-[#111111]">{message}</p> : null}
    </div>
  );
}
