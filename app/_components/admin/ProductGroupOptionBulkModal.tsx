"use client";

import { useEffect, useId, useMemo, useState } from "react";

export type MasterCodeChoice = {
  productCode: string;
  productName: string;
};

type BulkRowLocal = {
  key: string;
  sizeLabel: string;
  optionName: string;
  linkedProductCode: string;
  sortOrder: string;
};

function emptyRow(): BulkRowLocal {
  return {
    key: `bulk-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())}`,
    sizeLabel: "",
    optionName: "",
    linkedProductCode: "",
    sortOrder: "",
  };
}

export type BulkRegisterPayload = {
  sizeLabel: string;
  optionName: string;
  linkedProductCode: string;
  sortOrder: number;
  isActive: boolean;
};

type Props = {
  open: boolean;
  groupName: string;
  codeChoices: MasterCodeChoice[];
  onClose: () => void;
  /** 검증·저장은 부모에서 처리. 성공 시 모달은 닫힘 */
  onRegister: (items: BulkRegisterPayload[]) => { ok: true } | { ok: false; message: string };
};

export function ProductGroupOptionBulkModal({
  open,
  groupName,
  codeChoices,
  onClose,
  onRegister,
}: Props) {
  const titleId = useId();
  const [rows, setRows] = useState<BulkRowLocal[]>(() => [emptyRow()]);
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows([emptyRow()]);
    setInlineError(null);
  }, [open, groupName]);

  const choiceMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of codeChoices) {
      const code = c.productCode.trim();
      if (!code) continue;
      m.set(code.toLowerCase(), code);
    }
    return m;
  }, [codeChoices]);

  if (!open) return null;

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (key: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  };

  const updateRow = (key: string, patch: Partial<Omit<BulkRowLocal, "key">>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const handleSubmit = () => {
    setInlineError(null);
    const payloads: BulkRegisterPayload[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const size = r.sizeLabel.trim();
      const opt = r.optionName.trim();
      const code = r.linkedProductCode.trim();
      const orderRaw = r.sortOrder.trim();
      const orderNum = Number(orderRaw);

      const anyFilled = Boolean(size || opt || code || orderRaw !== "");
      const allFilled = Boolean(size && opt && code && orderRaw !== "");

      if (!anyFilled) {
        continue;
      }
      if (!allFilled) {
        setInlineError(`${i + 1}번째 행의 사이즈, 옵션명, 연동 제품코드, 정렬순서를 모두 입력해 주세요.`);
        return;
      }
      if (!Number.isFinite(orderNum)) {
        setInlineError(`${i + 1}번째 행의 정렬순서는 숫자만 입력해 주세요.`);
        return;
      }
      const canonical = choiceMap.get(code.toLowerCase());
      if (!canonical) {
        setInlineError(`${i + 1}번째 행의 연동 제품코드를 목록에서 선택해 주세요.`);
        return;
      }
      payloads.push({
        sizeLabel: size,
        optionName: opt,
        linkedProductCode: canonical,
        sortOrder: orderNum,
        isActive: true,
      });
    }

    if (payloads.length === 0) {
      setInlineError("등록할 행을 한 줄 이상 입력해 주세요.");
      return;
    }

    const batchKeys = new Set<string>();
    for (const p of payloads) {
      const k = `${p.sizeLabel}\0${p.optionName.toLowerCase()}\0${p.linkedProductCode.toLowerCase()}`;
      if (batchKeys.has(k)) {
        setInlineError("입력 목록 안에 동일한 사이즈·옵션명·제품코드 조합이 있습니다.");
        return;
      }
      batchKeys.add(k);
    }

    const result = onRegister(payloads);
    if (!result.ok) {
      setInlineError(result.message);
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-3 py-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(90vh,720px)] w-full max-w-4xl flex-col rounded-sm border border-[#E5E5E5] bg-white shadow-sm"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-[#E5E5E5] px-4 py-3">
          <div>
            <h2 id={titleId} className="text-sm font-semibold text-[#111111]">
              옵션 일괄 추가
            </h2>
            <p className="mt-1 text-xs text-[#666666]">
              상품군명{" "}
              <span className="font-medium text-[#111111]">{groupName || "(미선택)"}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1 text-xs text-[#666666] hover:bg-[#F5F5F5]"
          >
            닫기
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          {codeChoices.length === 0 ? (
            <p className="text-sm text-[#666666]">
              상품 마스터에 이 상품군명으로 등록된 제품이 없습니다. 마스터를 먼저 등록한 뒤 일괄 추가를 사용해
              주세요.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E5E5E5] bg-[#F5F5F5]">
                      {["사이즈", "옵션명", "연동 제품코드", "정렬순서", ""].map((h) => (
                        <th key={h} className="px-2 py-2 text-[11px] font-medium text-[#666666]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={row.key} className="border-b border-[#E5E5E5] last:border-b-0">
                        <td className="px-2 py-2 align-top">
                          <input
                            value={row.sizeLabel}
                            onChange={(e) => updateRow(row.key, { sizeLabel: e.target.value })}
                            placeholder="사이즈"
                            className="w-full rounded-sm border border-[#E5E5E5] px-2 py-1.5 text-xs text-[#111111]"
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <input
                            value={row.optionName}
                            onChange={(e) => updateRow(row.key, { optionName: e.target.value })}
                            placeholder="옵션명"
                            className="w-full rounded-sm border border-[#E5E5E5] px-2 py-1.5 text-xs text-[#111111]"
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <select
                            value={row.linkedProductCode}
                            onChange={(e) => updateRow(row.key, { linkedProductCode: e.target.value })}
                            className="w-full max-w-[280px] rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-xs text-[#111111]"
                          >
                            <option value="">선택</option>
                            {codeChoices.map((c) => (
                              <option key={c.productCode} value={c.productCode}>
                                {c.productCode} ({c.productName})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2 align-top">
                          <input
                            type="number"
                            value={row.sortOrder}
                            onChange={(e) => updateRow(row.key, { sortOrder: e.target.value })}
                            className="w-full max-w-[96px] rounded-sm border border-[#E5E5E5] px-2 py-1.5 text-xs text-[#111111]"
                          />
                        </td>
                        <td className="px-2 py-2 align-top text-xs">
                          <button
                            type="button"
                            disabled={rows.length <= 1}
                            onClick={() => removeRow(row.key)}
                            className="text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline disabled:opacity-40"
                          >
                            행 삭제
                          </button>
                          <span className="ml-2 text-[#888888]">{idx + 1}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={addRow}
                className="mt-3 rounded-sm border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#111111] hover:bg-[#F5F5F5]"
              >
                행 추가
              </button>
              <p className="mt-2 text-[11px] text-[#888888]">
                비워 둔 행은 무시됩니다. 저장 시 규칙에는 연동 제품코드와 입력하신 사이즈·옵션명·정렬순서만
                반영됩니다.
              </p>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-[#E5E5E5] px-4 py-3">
          {inlineError ? <p className="mb-2 text-xs text-[#111111]">{inlineError}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={codeChoices.length === 0}
              className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              일괄 등록
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5]"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
