"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProductGroupNameCombobox } from "../../_components/admin/ProductGroupNameCombobox";
import {
  ProductGroupOptionBulkModal,
  type BulkRegisterPayload,
} from "../../_components/admin/ProductGroupOptionBulkModal";
import { useProductGroupRegistry } from "../../_lib/productGroupRegistryStore";
import { useProductMasterRows } from "../../_lib/productMasterStore";
import { useProductGroupOptionRules } from "../../_lib/productGroupOptionStore";
import type { ProductMasterRow } from "../../_data/mockProductMaster";
import type { ProductGroupOptionRule } from "../../_types/productGroupOption";

/** 상품 마스터에서 해당 상품군명 행만 모아 제품코드 기준 중복 제거 (일괄 추가·단건 추가 공통) */
function masterCodesForProductGroup(
  rows: ProductMasterRow[],
  groupNameTrimmed: string,
): { productCode: string; productName: string }[] {
  if (!groupNameTrimmed) return [];
  const byCode = new Map<string, { productCode: string; productName: string }>();
  for (const row of rows) {
    if (row.productGroupName.trim() !== groupNameTrimmed) continue;
    const code = row.productCode.trim();
    if (!code) continue;
    const key = code.toLowerCase();
    if (!byCode.has(key)) {
      byCode.set(key, { productCode: code, productName: row.productName.trim() || code });
    }
  }
  return [...byCode.values()].sort((a, b) => a.productCode.localeCompare(b.productCode));
}

type RuleDraft = {
  groupName: string;
  sizeLabel: string;
  optionName: string;
  linkedProductCode: string;
  sortOrder: number;
  isActive: boolean;
};

const EMPTY_DRAFT: RuleDraft = {
  groupName: "",
  sizeLabel: "",
  optionName: "",
  linkedProductCode: "",
  sortOrder: 0,
  isActive: true,
};

export default function ProductGroupOptionsPage() {
  const [rows] = useProductMasterRows();
  const [registryEntries] = useProductGroupRegistry();
  const [rules, setRules] = useProductGroupOptionRules();
  const [draft, setDraft] = useState<RuleDraft>(EMPTY_DRAFT);
  const [message, setMessage] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingSortOrder, setEditingSortOrder] = useState<string>("");
  const [groupNameSearch, setGroupNameSearch] = useState("");
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  /** 일괄 추가 모달을 열 때점의 상품군명 (모달 중 상단 콤보 변경과 무관하게 유지) */
  const [bulkModalGroupName, setBulkModalGroupName] = useState("");

  /** 상품군 관리에서 「옵션 관리」가 켜진 레지스트리 행만 옵션 추가 후보 */
  const optionManagedGroupNames = useMemo(() => {
    return registryEntries
      .filter((e) => e.usesOptionRules === true)
      .map((e) => e.productGroupName.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "ko"));
  }, [registryEntries]);

  useEffect(() => {
    setDraft((prev) => {
      const g = prev.groupName.trim();
      if (!g) return prev;
      const ok = optionManagedGroupNames.some((n) => n === g);
      if (!ok) {
        return { ...prev, groupName: "", sizeLabel: "", linkedProductCode: "" };
      }
      return prev;
    });
  }, [optionManagedGroupNames]);

  const groupedRules = useMemo(() => {
    const map = new Map<string, ProductGroupOptionRule[]>();
    for (const rule of rules) {
      const bucket = map.get(rule.groupName) ?? [];
      bucket.push(rule);
      map.set(rule.groupName, bucket);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rules]);

  const filteredGroupedRules = useMemo(() => {
    const q = groupNameSearch.trim().toLowerCase();
    if (!q) return groupedRules;
    return groupedRules.filter(([name]) => name.toLowerCase().includes(q));
  }, [groupedRules, groupNameSearch]);

  const masterCodeChoicesForDraftGroup = useMemo(
    () => masterCodesForProductGroup(rows, draft.groupName.trim()),
    [rows, draft.groupName],
  );

  /** 일괄 추가 모달 대상 상품군의 마스터 제품코드·제품명 */
  const masterCodeChoicesForBulkModal = useMemo(
    () => masterCodesForProductGroup(rows, bulkModalGroupName.trim()),
    [rows, bulkModalGroupName],
  );

  const draftGroupManaged =
    Boolean(draft.groupName.trim()) &&
    optionManagedGroupNames.some((n) => n === draft.groupName.trim());

  const handleBulkRegister = (
    items: BulkRegisterPayload[],
  ): { ok: true } | { ok: false; message: string } => {
    const groupName = bulkModalGroupName.trim();
    if (!groupName) {
      return { ok: false, message: "상품군명을 선택해 주세요." };
    }
    if (!optionManagedGroupNames.some((n) => n === groupName)) {
      return {
        ok: false,
        message:
          "상품군 관리에서 해당 상품군의 「옵션 관리」를 켠 뒤에만 옵션을 추가할 수 있습니다.",
      };
    }

    const allowedCodes = new Set(
      masterCodeChoicesForBulkModal.map((c) => c.productCode.toLowerCase()),
    );

    const nextRules: ProductGroupOptionRule[] = [];
    let idSeed = Date.now();

    for (const item of items) {
      const sizeLabel = item.sizeLabel.trim();
      const optionName = item.optionName.trim();
      const linkedProductCode = item.linkedProductCode.trim();

      if (!allowedCodes.has(linkedProductCode.toLowerCase())) {
        return {
          ok: false,
          message: `연동 제품코드가 이 상품군 마스터에 없습니다: ${linkedProductCode}`,
        };
      }

      const duplicated =
        rules.some(
          (rule) =>
            rule.groupName === groupName &&
            rule.sizeLabel === sizeLabel &&
            rule.optionName.toLowerCase() === optionName.toLowerCase() &&
            rule.linkedProductCode.toLowerCase() === linkedProductCode.toLowerCase(),
        ) ||
        nextRules.some(
          (rule) =>
            rule.sizeLabel === sizeLabel &&
            rule.optionName.toLowerCase() === optionName.toLowerCase() &&
            rule.linkedProductCode.toLowerCase() === linkedProductCode.toLowerCase(),
        );

      if (duplicated) {
        return {
          ok: false,
          message: `동일한 상품군/사이즈/옵션/제품코드 조합이 이미 있거나 목록에 중복됩니다: ${optionName}`,
        };
      }

      nextRules.push({
        id: `pgo-${idSeed++}`,
        groupName,
        sizeLabel,
        optionName,
        linkedProductCode,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
      });
    }

    setRules([...rules, ...nextRules]);
    setMessage(`옵션 ${nextRules.length}건을 일괄 등록했습니다.`);
    return { ok: true };
  };

  const addRule = () => {
    const groupName = draft.groupName.trim();
    const sizeLabel = draft.sizeLabel.trim();
    const optionName = draft.optionName.trim();
    const linkedProductCode = draft.linkedProductCode.trim();
    if (!groupName) {
      setMessage("상품군명을 선택해 주세요.");
      return;
    }
    if (!optionManagedGroupNames.some((n) => n === groupName)) {
      setMessage(
        "상품군 관리에서 해당 상품군의 「옵션 관리」를 켠 뒤에만 옵션을 추가할 수 있습니다.",
      );
      return;
    }
    if (!optionName) {
      setMessage("옵션명을 입력해 주세요.");
      return;
    }
    if (!sizeLabel) {
      setMessage("사이즈를 입력해 주세요.");
      return;
    }
    if (!linkedProductCode) {
      setMessage("연동 제품코드를 목록에서 선택해 주세요.");
      return;
    }

    const allowedCodes = new Set(
      masterCodeChoicesForDraftGroup.map((c) => c.productCode.toLowerCase()),
    );
    if (!allowedCodes.has(linkedProductCode.toLowerCase())) {
      setMessage("연동 제품코드가 이 상품군 마스터에 없습니다. 목록에서 선택해 주세요.");
      return;
    }

    const duplicated = rules.some(
      (rule) =>
        rule.groupName === groupName &&
        rule.sizeLabel === sizeLabel &&
        rule.optionName.toLowerCase() === optionName.toLowerCase() &&
        rule.linkedProductCode.toLowerCase() === linkedProductCode.toLowerCase(),
    );
    if (duplicated) {
      setMessage("동일한 상품군/옵션/제품코드 조합이 이미 등록되어 있습니다.");
      return;
    }

    const nextRule: ProductGroupOptionRule = {
      id: `pgo-${Date.now()}`,
      groupName,
      sizeLabel,
      optionName,
      linkedProductCode,
      sortOrder: draft.sortOrder,
      isActive: draft.isActive,
    };
    setRules([...rules, nextRule]);
    setDraft({
      ...EMPTY_DRAFT,
      groupName,
      sizeLabel,
    });
    setMessage("옵션을 등록했습니다.");
  };

  const toggleActive = (id: string) => {
    setRules(
      rules.map((rule) =>
        rule.id === id ? { ...rule, isActive: !rule.isActive } : rule,
      ),
    );
    setMessage("옵션 사용 여부를 변경했습니다.");
  };

  const removeRule = (id: string) => {
    setRules(rules.filter((rule) => rule.id !== id));
    setMessage("옵션을 삭제했습니다.");
  };

  const startEditSortOrder = (rule: ProductGroupOptionRule) => {
    setEditingRuleId(rule.id);
    setEditingSortOrder(String(rule.sortOrder));
    setMessage(null);
  };

  const cancelEditSortOrder = () => {
    setEditingRuleId(null);
    setEditingSortOrder("");
  };

  const saveSortOrder = (id: string) => {
    const nextOrder = Number(editingSortOrder);
    if (!Number.isFinite(nextOrder)) {
      setMessage("정렬순서는 숫자만 입력해 주세요.");
      return;
    }
    setRules(
      rules.map((rule) => (rule.id === id ? { ...rule, sortOrder: nextOrder } : rule)),
    );
    setEditingRuleId(null);
    setEditingSortOrder("");
    setMessage("정렬순서를 수정했습니다.");
  };

  return (
    <section>
      <h1 className="text-lg font-semibold text-[#111111]">상품군별 옵션 관리</h1>
      <p className="mt-1 text-sm text-[#666666]">
        상품군별로 사용자 상품상세에서 보여줄 옵션과 연동 제품코드를 등록합니다. 옵션 추가 시 상품군명은{" "}
        <Link href="/admin/product-group-registry" className="text-[#111111] underline-offset-2 hover:underline">
          상품군 관리
        </Link>
        에서 「옵션 관리」를 켠 상품군만 선택할 수 있습니다. 활성 옵션 규칙에 적힌 사이즈만 사용자 카탈로그 사이즈
        선택에 나타나며, 해당 문자열과 일치하는 상품 마스터 행이 있어야 합니다.
      </p>

      <div className="mt-4 flex max-w-md flex-col gap-1">
        <label htmlFor="group-name-search" className="text-xs text-[#888888]">
          상품군명 검색
        </label>
        <input
          id="group-name-search"
          type="search"
          value={groupNameSearch}
          onChange={(e) => setGroupNameSearch(e.target.value)}
          placeholder="등록된 상품군명 일부를 입력"
          className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111]"
        />
        <p className="text-xs text-[#888888]">비우면 전체 목록을 표시합니다.</p>
      </div>

      <div className="mt-5 rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] p-4">
        <h2 className="text-sm font-medium text-[#111111]">옵션 추가</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label htmlFor="pgo-draft-group" className="text-xs text-[#888888]">
              상품군명
            </label>
            <ProductGroupNameCombobox
              id="pgo-draft-group"
              value={draft.groupName}
              options={optionManagedGroupNames}
              onChange={(groupName) =>
                setDraft((prev) => ({
                  ...prev,
                  groupName,
                  sizeLabel: "",
                  linkedProductCode: "",
                }))
              }
            />
            <p className="text-[11px] text-[#666666]">
              목록이 비어 있으면 상품군 관리에서 해당 상품군의 「옵션 관리」를 켜 주세요. 입력하면 목록이 필터링됩니다.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="pgo-draft-size" className="text-xs text-[#888888]">
              사이즈
            </label>
            <input
              id="pgo-draft-size"
              value={draft.sizeLabel}
              onChange={(e) => setDraft((prev) => ({ ...prev, sizeLabel: e.target.value }))}
              placeholder="예: 1400 x 700"
              className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-2 text-sm text-[#111111]"
            />
            <p className="text-[11px] text-[#666666]">
              입력된 사이즈로 사용자화면 상품 상세 페이지에 표시됩니다.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#888888]">옵션명</label>
            <input
              value={draft.optionName}
              onChange={(e) => setDraft((prev) => ({ ...prev, optionName: e.target.value }))}
              placeholder="예: 콘센트"
              className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-2 text-sm text-[#111111]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="pgo-draft-linked-code" className="text-xs text-[#888888]">
              연동 제품코드
            </label>
            <select
              id="pgo-draft-linked-code"
              value={draft.linkedProductCode}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, linkedProductCode: e.target.value }))
              }
              disabled={!draft.groupName.trim() || masterCodeChoicesForDraftGroup.length === 0}
              className="max-w-full rounded-sm border border-[#E5E5E5] bg-white px-2 py-2 text-sm text-[#111111] disabled:cursor-not-allowed disabled:bg-[#F5F5F5] disabled:text-[#888888]"
            >
              <option value="">선택</option>
              {masterCodeChoicesForDraftGroup.map((c) => (
                <option key={c.productCode} value={c.productCode}>
                  {c.productCode} ({c.productName})
                </option>
              ))}
            </select>
            {draft.groupName.trim() && masterCodeChoicesForDraftGroup.length === 0 ? (
              <p className="text-[11px] text-[#666666]">
                상품 마스터에 이 상품군명으로 등록된 제품이 없습니다.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#888888]">정렬순서</label>
            <input
              type="number"
              value={draft.sortOrder}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))
              }
              className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-2 text-sm text-[#111111]"
            />
          </div>
          <div className="flex items-end gap-2 lg:col-span-2">
            <label className="inline-flex items-center gap-1 text-xs text-[#666666]">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => setDraft((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              사용
            </label>
            <button
              type="button"
              onClick={addRule}
              className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
            >
              옵션 추가
            </button>
            {draftGroupManaged ? (
              <button
                type="button"
                onClick={() => {
                  setBulkModalGroupName(draft.groupName.trim());
                  setBulkModalOpen(true);
                }}
                className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-medium text-[#111111] hover:bg-[#F5F5F5]"
              >
                일괄 추가
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <ProductGroupOptionBulkModal
        open={bulkModalOpen}
        groupName={bulkModalGroupName.trim()}
        codeChoices={masterCodeChoicesForBulkModal}
        onClose={() => setBulkModalOpen(false)}
        onRegister={handleBulkRegister}
      />

      <div className="mt-5 space-y-4">
        {groupedRules.length === 0 ? (
          <div className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-10 text-center text-sm text-[#888888]">
            등록된 상품군 옵션이 없습니다.
          </div>
        ) : filteredGroupedRules.length === 0 ? (
          <div className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-10 text-center text-sm text-[#888888]">
            검색 조건에 맞는 상품군이 없습니다.
          </div>
        ) : (
          filteredGroupedRules.map(([groupName, groupRules]) => (
            <section key={groupName} className="rounded-sm border border-[#E5E5E5] bg-white p-3">
              <h3 className="text-sm font-medium text-[#111111]">{groupName}</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E5E5E5] bg-[#F5F5F5]">
                      {["사이즈", "옵션명", "연동 제품코드", "정렬순서", "사용여부", "관리"].map((header) => (
                        <th key={header} className="px-2 py-2 text-[11px] font-medium text-[#666666]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...groupRules]
                      .sort((a, b) => a.sortOrder - b.sortOrder || a.optionName.localeCompare(b.optionName))
                      .map((rule) => (
                        <tr key={rule.id} className="border-b border-[#E5E5E5] last:border-b-0">
                          <td className="px-2 py-2 text-xs text-[#666666]">{rule.sizeLabel}</td>
                          <td className="px-2 py-2 text-xs text-[#111111]">{rule.optionName}</td>
                          <td className="px-2 py-2 text-xs font-mono text-[#666666]">
                            {rule.linkedProductCode}
                          </td>
                          <td className="px-2 py-2 text-xs text-[#666666]">
                            {editingRuleId === rule.id ? (
                              <input
                                type="number"
                                value={editingSortOrder}
                                onChange={(e) => setEditingSortOrder(e.target.value)}
                                className="w-20 rounded-sm border border-[#E5E5E5] px-2 py-1 text-xs text-[#111111]"
                              />
                            ) : (
                              rule.sortOrder
                            )}
                          </td>
                          <td className="px-2 py-2 text-xs text-[#666666]">
                            {rule.isActive ? "사용" : "미사용"}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {editingRuleId === rule.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => saveSortOrder(rule.id)}
                                  className="mr-3 text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
                                >
                                  저장
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditSortOrder}
                                  className="mr-3 text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
                                >
                                  취소
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEditSortOrder(rule)}
                                className="mr-3 text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
                              >
                                수정
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleActive(rule.id)}
                              className="mr-3 text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
                            >
                              {rule.isActive ? "사용중지" : "사용"}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRule(rule.id)}
                              className="text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </div>

      {message ? <p className="mt-4 text-xs text-[#111111]">{message}</p> : null}
    </section>
  );
}
