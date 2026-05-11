"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminAccountState } from "../../_lib/adminAccountStore";
import { getSupabaseClient } from "../../_lib/supabase";
import {
  fetchStores,
  usernameToEmail,
  type AdminProfileRow,
  type StoreRow,
} from "../../_lib/supabaseAdmin";

export default function MyAccountPage() {
  const [state] = useAdminAccountState();
  const session = state.session;

  const [profile, setProfile] = useState<AdminProfileRow | null>(null);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [nameDraft, setNameDraft] = useState("");
  const [teamDraft, setTeamDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [nextPasswordConfirm, setNextPasswordConfirm] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [profileRes, storesData] = await Promise.all([
        client
          .from("admin_profiles")
          .select(
            "id, role, username, name, phone, team, is_super, store_id, status, rejected_reason, created_at",
          )
          .eq("id", session.accountId)
          .single<AdminProfileRow>(),
        fetchStores(),
      ]);
      if (cancelled) return;
      setStores(storesData);
      if (profileRes.data) {
        setProfile(profileRes.data);
        setNameDraft(profileRes.data.name ?? "");
        setPhoneDraft(profileRes.data.phone ?? "");
        setTeamDraft(profileRes.data.team ?? "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const storeNameById = useMemo(
    () => new Map(stores.map((store) => [store.id, store.name])),
    [stores],
  );

  const saveProfile = async () => {
    if (!profile) return;
    const normalizedPhone = phoneDraft.replace(/-/g, "").trim();
    if (!normalizedPhone) {
      setMessage("핸드폰번호를 입력해 주세요.");
      return;
    }
    if (!/^\d{10,11}$/.test(normalizedPhone)) {
      setMessage("핸드폰번호는 숫자만 10~11자리로 입력해 주세요.");
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      setMessage("서버에 연결할 수 없습니다.");
      return;
    }
    setIsSavingProfile(true);
    try {
      const patch: Record<string, unknown> = {
        phone: normalizedPhone,
        name: nameDraft.trim() || profile.name,
      };
      if (profile.role === "master") {
        patch.team = teamDraft.trim() || profile.team;
      }
      const { error } = await client.from("admin_profiles").update(patch).eq("id", profile.id);
      if (error) {
        setMessage(`저장 중 오류가 발생했습니다. (${error.message})`);
        return;
      }
      setProfile({ ...profile, ...patch } as AdminProfileRow);
      setMessage("내 정보가 저장되었습니다.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!profile) return;
    if (!currentPassword || !nextPassword || !nextPasswordConfirm) {
      setMessage("비밀번호 변경 항목을 모두 입력해 주세요.");
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
    if (nextPassword.length < 6) {
      setMessage("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      setMessage("서버에 연결할 수 없습니다.");
      return;
    }
    setIsChangingPw(true);
    try {
      const email = usernameToEmail(profile.username);
      const { error: signInError } = await client.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        setMessage("현재 비밀번호가 일치하지 않습니다.");
        return;
      }
      const { error: updateError } = await client.auth.updateUser({ password: nextPassword });
      if (updateError) {
        setMessage(`비밀번호 변경 중 오류가 발생했습니다. (${updateError.message})`);
        return;
      }
      setCurrentPassword("");
      setNextPassword("");
      setNextPasswordConfirm("");
      setMessage("비밀번호가 변경되었습니다.");
    } finally {
      setIsChangingPw(false);
    }
  };

  if (!session) {
    return null;
  }
  if (loading) {
    return (
      <section>
        <h1 className="text-lg font-semibold text-[#111111]">내 정보 관리</h1>
        <p className="mt-2 text-sm text-[#666666]">불러오는 중…</p>
      </section>
    );
  }
  if (!profile) {
    return (
      <section>
        <h1 className="text-lg font-semibold text-[#111111]">내 정보 관리</h1>
        <p className="mt-2 text-sm text-[#666666]">본인 계정 정보를 찾을 수 없습니다.</p>
      </section>
    );
  }

  const storeDisplay = profile.store_id
    ? storeNameById.get(profile.store_id) ?? profile.store_id
    : "-";
  const roleDisplay =
    profile.role === "master"
      ? profile.is_super
        ? "총괄 마스터 관리자"
        : "마스터 관리자"
      : "매장 관리자";

  return (
    <section>
      <h1 className="text-lg font-semibold text-[#111111]">내 정보 관리</h1>
      <p className="mt-1 text-sm text-[#666666]">
        로그인한 본인 계정 정보만 수정할 수 있습니다.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-sm border border-[#E5E5E5] bg-white p-4">
          <h2 className="text-sm font-medium text-[#111111]">기본 정보</h2>
          <p className="mt-1 text-xs text-[#888888]">
            아이디/역할/소속매장은 관리자 권한으로만 변경 가능합니다.
          </p>

          <div className="mt-4 grid gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">이름</label>
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">아이디</label>
              <input
                value={profile.username}
                disabled
                className="rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-1.5 text-sm text-[#666666]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">역할</label>
              <input
                value={roleDisplay}
                disabled
                className="rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-1.5 text-sm text-[#666666]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">소속매장</label>
              <input
                value={storeDisplay}
                disabled
                className="rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-1.5 text-sm text-[#666666]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">총괄 권한 여부</label>
              <input
                value={profile.role === "master" ? (profile.is_super ? "Y" : "N") : "-"}
                disabled
                className="rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-1.5 text-sm text-[#666666]"
              />
            </div>
            {profile.role === "master" ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#888888]">소속팀</label>
                <input
                  value={teamDraft}
                  onChange={(e) => setTeamDraft(e.target.value)}
                  className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">핸드폰번호</label>
              <input
                value={phoneDraft}
                onChange={(e) => setPhoneDraft(e.target.value)}
                className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
              />
            </div>
            <button
              type="button"
              onClick={saveProfile}
              disabled={isSavingProfile}
              className="mt-1 w-fit rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {isSavingProfile ? "저장 중…" : "기본 정보 저장"}
            </button>
          </div>
        </section>

        <section className="rounded-sm border border-[#E5E5E5] bg-white p-4">
          <h2 className="text-sm font-medium text-[#111111]">비밀번호 변경</h2>
          <p className="mt-1 text-xs text-[#888888]">
            현재 비밀번호 확인 후 새 비밀번호로 변경합니다. (6자 이상)
          </p>
          <div className="mt-4 grid gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">현재 비밀번호</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">신규 비밀번호</label>
              <input
                type="password"
                value={nextPassword}
                onChange={(e) => setNextPassword(e.target.value)}
                className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#888888]">신규 비밀번호 확인</label>
              <input
                type="password"
                value={nextPasswordConfirm}
                onChange={(e) => setNextPasswordConfirm(e.target.value)}
                className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
              />
            </div>
            <button
              type="button"
              onClick={changePassword}
              disabled={isChangingPw}
              className="mt-1 w-fit rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {isChangingPw ? "변경 중…" : "비밀번호 변경"}
            </button>
          </div>
        </section>
      </div>

      {message ? <p className="mt-4 text-xs text-[#111111]">{message}</p> : null}
    </section>
  );
}
