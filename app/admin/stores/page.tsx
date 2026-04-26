"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { adminHref } from "../../_components/admin/adminHref";
import { useAdminAccountState } from "../../_lib/adminAccountStore";

export default function AdminStoresPage() {
  const [state, setState] = useAdminAccountState();
  const stores = state.stores;
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeCodeDraft, setStoreCodeDraft] = useState("");
  const [storeNameDraft, setStoreNameDraft] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const normalizedCode = useMemo(() => storeCodeDraft.trim().toUpperCase(), [storeCodeDraft]);
  const normalizedName = useMemo(() => storeNameDraft.trim(), [storeNameDraft]);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingStoreId(null);
    setStoreCodeDraft("");
    setStoreNameDraft("");
    setFormError(null);
  };

  const openEditModal = (storeId: string) => {
    const target = stores.find((store) => store.id === storeId);
    if (!target) return;
    setModalMode("edit");
    setEditingStoreId(storeId);
    setStoreCodeDraft(target.code);
    setStoreNameDraft(target.name);
    setFormError(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingStoreId(null);
    setFormError(null);
  };

  const handleCreateStore = () => {
    if (!normalizedCode) {
      setFormError("매장코드를 입력해 주세요.");
      return;
    }
    if (!normalizedName) {
      setFormError("매장명을 입력해 주세요.");
      return;
    }
    const duplicated = stores.some((store) => store.code.toUpperCase() === normalizedCode);
    if (duplicated) {
      setFormError("이미 등록된 매장코드입니다.");
      return;
    }

    const newStore = {
      id: `store-${Date.now()}`,
      code: normalizedCode,
      name: normalizedName,
    };
    setState({ ...state, stores: [newStore, ...stores] });
    closeModal();
  };

  const handleUpdateStore = () => {
    if (!editingStoreId) return;
    if (!normalizedName) {
      setFormError("매장명을 입력해 주세요.");
      return;
    }

    setState({
      ...state,
      stores: stores.map((store) =>
        store.id === editingStoreId ? { ...store, name: normalizedName } : store,
      ),
    });
    closeModal();
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-[#111111]">매장 목록</h1>
      <p className="mt-1 text-sm text-[#666666]">
        매장 등록·수정을 관리하는 화면입니다.
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
            {stores.map((store) => (
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
                      href={adminHref(`/admin/operations?storeId=${store.id}&tab=info`, "master")}
                      className="text-[#111111] underline-offset-2 hover:underline"
                    >
                      매장 운영
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
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

            {formError ? <p className="mt-3 text-xs text-[#111111]">{formError}</p> : null}

            <div className="mt-4 flex justify-end gap-2 border-t border-[#E5E5E5] pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#666666] hover:text-[#111111]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={modalMode === "create" ? handleCreateStore : handleUpdateStore}
                className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
              >
                {modalMode === "create" ? "등록" : "수정"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
