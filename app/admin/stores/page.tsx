"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminHref } from "../../_components/admin/adminHref";
import {
  createStore,
  fetchStores,
  updateStoreName,
  type StoreRow,
} from "../../_lib/supabaseAdmin";

function suggestStoreIdFromCode(code: string): string {
  const slug = code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `store-${slug}` : "";
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeIdDraft, setStoreIdDraft] = useState("");
  const [storeCodeDraft, setStoreCodeDraft] = useState("");
  const [storeNameDraft, setStoreNameDraft] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await fetchStores();
    setStores(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const normalizedCode = useMemo(() => storeCodeDraft.trim().toUpperCase(), [storeCodeDraft]);
  const normalizedName = useMemo(() => storeNameDraft.trim(), [storeNameDraft]);
  const normalizedId = useMemo(() => storeIdDraft.trim().toLowerCase(), [storeIdDraft]);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingStoreId(null);
    setStoreIdDraft("");
    setStoreCodeDraft("");
    setStoreNameDraft("");
    setFormError(null);
  };

  const openEditModal = (storeId: string) => {
    const target = stores.find((store) => store.id === storeId);
    if (!target) return;
    setModalMode("edit");
    setEditingStoreId(storeId);
    setStoreIdDraft(target.id);
    setStoreCodeDraft(target.code);
    setStoreNameDraft(target.name);
    setFormError(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingStoreId(null);
    setFormError(null);
  };

  const handleCreateStore = async () => {
    if (!normalizedCode) {
      setFormError("매장코드를 입력해 주세요.");
      return;
    }
    if (!normalizedName) {
      setFormError("매장명을 입력해 주세요.");
      return;
    }
    const idValue = normalizedId || suggestStoreIdFromCode(normalizedCode);
    if (!idValue) {
      setFormError("매장 ID 를 입력해 주세요. (영문/숫자/하이픈)");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(idValue)) {
      setFormError("매장 ID 는 영문 소문자/숫자/하이픈만 사용할 수 있습니다.");
      return;
    }
    if (stores.some((store) => store.id === idValue)) {
      setFormError("이미 사용 중인 매장 ID 입니다.");
      return;
    }
    if (stores.some((store) => store.code.toUpperCase() === normalizedCode)) {
      setFormError("이미 등록된 매장코드입니다.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await createStore({ id: idValue, code: normalizedCode, name: normalizedName });
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      await reload();
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStore = async () => {
    if (!editingStoreId) return;
    if (!normalizedName) {
      setFormError("매장명을 입력해 주세요.");
      return;
    }
    setIsSaving(true);
    try {
      const result = await updateStoreName(editingStoreId, normalizedName);
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      await reload();
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-[#111111]">매장 목록</h1>
      <p className="mt-1 text-sm text-[#666666]">
        매장 등록·수정을 관리하는 화면입니다. 등록한 매장은 모든 관리자/신청자에게 동일하게 보입니다.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-b border-[#E5E5E5] pb-4">
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-sm bg-[#111111] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          매장 등록
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-sm border border-[#E5E5E5]">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E5E5E5] bg-[#F5F5F5]">
              <th className="px-3 py-2 text-xs font-medium text-[#666666]">매장코드</th>
              <th className="px-3 py-2 text-xs font-medium text-[#666666]">매장명</th>
              <th className="px-3 py-2 text-xs font-medium text-[#666666]">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-xs text-[#888888]">
                  불러오는 중…
                </td>
              </tr>
            ) : stores.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-xs text-[#888888]">
                  등록된 매장이 없습니다. “매장 등록” 버튼으로 추가해 주세요.
                </td>
              </tr>
            ) : (
              stores.map((store) => (
                <tr key={store.id} className="border-b border-[#E5E5E5] last:border-b-0">
                  <td className="px-3 py-3 text-xs font-mono text-[#666666]">{store.code}</td>
                  <td className="px-3 py-3 text-sm text-[#111111]">{store.name}</td>
                  <td className="px-3 py-3 text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openEditModal(store.id)}
                        className="text-[#111111] underline-offset-2 hover:underline"
                      >
                        수정
                      </button>
                      <Link
                        href={adminHref(`/admin/operations?storeId=${store.id}&tab=merchandising`, "master")}
                        className="text-[#111111] underline-offset-2 hover:underline"
                      >
                        매장 운영
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalMode ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 px-4">
          <section className="w-full max-w-md rounded-sm border border-[#E5E5E5] bg-white p-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <h2 className="text-sm font-semibold text-[#111111]">
                {modalMode === "create" ? "매장 등록" : "매장 수정"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-xs text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="store-create-id" className="text-xs text-[#888888]">
                  매장 ID
                </label>
                <input
                  id="store-create-id"
                  value={storeIdDraft}
                  onChange={(e) => setStoreIdDraft(e.target.value)}
                  disabled={modalMode === "edit"}
                  placeholder="예: store-nowon (영문/숫자/하이픈, 비우면 자동 생성)"
                  className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111] disabled:bg-[#F5F5F5] disabled:text-[#888888]"
                />
                <p className="text-[11px] text-[#888888]">
                  한 번 정하면 변경할 수 없습니다.
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="store-create-code" className="text-xs text-[#888888]">
                  매장코드
                </label>
                <input
                  id="store-create-code"
                  value={storeCodeDraft}
                  onChange={(e) => setStoreCodeDraft(e.target.value)}
                  disabled={modalMode === "edit"}
                  placeholder="예: GNM"
                  className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111] disabled:bg-[#F5F5F5] disabled:text-[#888888]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="store-create-name" className="text-xs text-[#888888]">
                  매장명
                </label>
                <input
                  id="store-create-name"
                  value={storeNameDraft}
                  onChange={(e) => setStoreNameDraft(e.target.value)}
                  placeholder="예: DESKER 강남점"
                  className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
                />
              </div>
            </div>

            {formError ? <p className="mt-3 text-xs text-[#B00020]">{formError}</p> : null}

            <div className="mt-4 flex justify-end gap-2 border-t border-[#E5E5E5] pt-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#666666] hover:text-[#111111] disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={modalMode === "create" ? handleCreateStore : handleUpdateStore}
                disabled={isSaving}
                className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? "저장 중…" : modalMode === "create" ? "등록" : "수정"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
