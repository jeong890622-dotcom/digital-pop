"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProductGroupRegistryEntry } from "../../_types/productGroupRegistry";
import {
  addProductGroupByName,
  clearProductGroupRegistry,
  deleteProductGroupRegistryEntry,
  renameProductGroupRegistryEntry,
  setProductGroupRegistryEntries,
  setProductGroupUsesOptionRules,
  useProductGroupRegistry,
} from "../../_lib/productGroupRegistryStore";
import { EXCEL_ERROR_CELL_HINT, looksLikeExcelErrorCell } from "../../_lib/excelFormulaErrorLabel";
import { useProductGroupOptionRules } from "../../_lib/productGroupOptionStore";
import { readUploadTextFile } from "../../_lib/readUploadTextFile";
import type { ProductGroupOptionRule } from "../../_types/productGroupOption";

function registryRowHasRegisteredOptions(
  rules: ProductGroupOptionRule[],
  productGroupName: string,
): boolean {
  const g = productGroupName.trim();
  if (!g) return false;
  return rules.some((r) => r.groupName.trim() === g);
}

const BULK_COLUMNS = ["상품군명"] as const;

const RAW_DOWNLOAD_COLUMNS = ["id", "상품군명", "옵션관리"] as const;

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadRegistryRaw(rows: ProductGroupRegistryEntry[]): void {
  const lines = rows.map((row) =>
    [row.id, row.productGroupName, row.usesOptionRules === true ? "Y" : "N"]
      .map((cell) => csvEscape(String(cell)))
      .join(","),
  );
  const bom = "\uFEFF";
  const content = `${bom}${RAW_DOWNLOAD_COLUMNS.join(",")}\n${lines.join("\n")}\n`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "product-group-registry-raw.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function splitUploadLine(line: string): string[] {
  if (line.includes("\t")) {
    return line.split("\t").map((cell) => cell.trim());
  }
  return line.split(",").map((cell) => cell.trim());
}

function parseDelimitedLines(rawText: string): string[][] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(splitUploadLine);
}

function downloadTemplate(): void {
  const bom = "\uFEFF";
  const content = `${bom}${BULK_COLUMNS.join(",")}\n`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "product-group-registry-bulk.csv";
  link.click();
  URL.revokeObjectURL(url);
}

type BulkFailure = { rowLabel: string; reason: string };

export default function ProductGroupRegistryPage() {
  const [entries, setEntries] = useProductGroupRegistry();
  const [optionRules] = useProductGroupOptionRules();
  const [nameDraft, setNameDraft] = useState("");
  const [addUsesOptionRules, setAddUsesOptionRules] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkFailures, setBulkFailures] = useState<BulkFailure[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => a.productGroupName.localeCompare(b.productGroupName)),
    [entries],
  );

  const handleToggleUsesOptionRules = (
    row: ProductGroupRegistryEntry,
    nextChecked: boolean,
  ) => {
    if (
      !nextChecked &&
      row.usesOptionRules === true &&
      registryRowHasRegisteredOptions(optionRules, row.productGroupName)
    ) {
      setMessage({
        ok: false,
        text: "이 상품군에 상품군별 옵션 관리로 등록된 옵션이 있으면 옵션 관리를 해제할 수 없습니다. 해당 옵션을 먼저 삭제해 주세요.",
      });
      return;
    }
    setMessage(null);
    setProductGroupRegistryEntries(setProductGroupUsesOptionRules(entries, row.id, nextChecked));
  };

  const handleAddOne = () => {
    setMessage(null);
    const result = addProductGroupByName(entries, nameDraft, {
      usesOptionRules: addUsesOptionRules,
    });
    if (!result.ok) {
      setMessage({ ok: false, text: result.reason });
      return;
    }
    setProductGroupRegistryEntries(result.next);
    setNameDraft("");
    setAddUsesOptionRules(false);
    setMessage({ ok: true, text: "상품군이 등록되었습니다. 코드는 자동으로 부여됩니다." });
  };

  const handleDelete = (id: string) => {
    const confirmed = window.confirm("이 상품군 등록을 삭제할까요? 기존 상품 마스터 행과 불일치할 수 있습니다.");
    if (!confirmed) return;
    if (editingId === id) {
      setEditingId(null);
      setEditDraft("");
    }
    setProductGroupRegistryEntries(deleteProductGroupRegistryEntry(entries, id));
    setMessage({ ok: true, text: "삭제했습니다." });
  };

  const startEdit = (row: ProductGroupRegistryEntry) => {
    setMessage(null);
    setEditingId(row.id);
    setEditDraft(row.productGroupName);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  const saveEdit = () => {
    if (!editingId) return;
    const result = renameProductGroupRegistryEntry(entries, editingId, editDraft);
    if (!result.ok) {
      setMessage({ ok: false, text: result.reason });
      return;
    }
    setProductGroupRegistryEntries(result.next);
    cancelEdit();
    setMessage({ ok: true, text: "상품군명을 저장했습니다. 상품 마스터에 같은 상품군이 있으면 명칭을 맞춰 주세요." });
  };

  const handleClearAll = () => {
    const confirmed = window.confirm(
      "등록된 상품군을 모두 삭제할까요? 이 브라우저에만 적용되며, 상품 마스터에 남아 있는 상품군명과는 더 이상 맞지 않을 수 있습니다.",
    );
    if (!confirmed) return;
    setMessage(null);
    setBulkFailures([]);
    cancelEdit();
    clearProductGroupRegistry();
    setMessage({ ok: true, text: "상품군 레지스트리를 비웠습니다." });
  };

  const handleBulk = async () => {
    setMessage(null);
    setBulkFailures([]);
    if (!bulkFile) {
      setMessage({ ok: false, text: "파일을 선택해 주세요." });
      return;
    }
    const text = await readUploadTextFile(bulkFile).catch(() => "");
    const rows = parseDelimitedLines(text);
    if (rows.length === 0) {
      setMessage({ ok: false, text: "파일 데이터가 비어 있습니다." });
      return;
    }
    const first = rows[0]!;
    const hasHeader = first[0] === BULK_COLUMNS[0];
    const body = hasHeader ? rows.slice(1) : rows;
    const failures: BulkFailure[] = [];
    let working = [...entries];
    for (let i = 0; i < body.length; i += 1) {
      const cells = body[i]!;
      const name = (cells[0] ?? "").trim();
      if (!name) {
        failures.push({ rowLabel: `${i + 1}행`, reason: "상품군명이 비어 있습니다." });
        continue;
      }
      const result = addProductGroupByName(working, name);
      if (!result.ok) {
        failures.push({ rowLabel: `${i + 1}행`, reason: result.reason });
        continue;
      }
      working = result.next;
    }
    setProductGroupRegistryEntries(working);
    setBulkFailures(failures);
    setBulkFile(null);
    setMessage({
      ok: failures.length === 0,
      text:
        failures.length === 0
          ? `일괄 등록을 반영했습니다. (총 ${body.length}행 처리)`
          : `일괄 등록을 부분 반영했습니다. 성공 ${body.length - failures.length}건, 실패 ${failures.length}건`,
    });
  };

  return (
    <section>
      <h1 className="text-lg font-semibold text-[#111111]">상품군 관리</h1>
      <p className="mt-1 text-sm text-[#666666]">
        상품군은 이름만 등록합니다. 내부 식별용 코드는 자동 부여되며 화면·엑셀 양식에는 노출하지 않습니다.{" "}
        <Link href="/admin/products" className="text-[#111111] underline-offset-2 hover:underline">
          상품 마스터
        </Link>
        에서는 여기에 등록된 상품군만 선택·업로드할 수 있습니다. 「옵션 관리」를 켠 상품군만{" "}
        <Link href="/admin/product-group-options" className="text-[#111111] underline-offset-2 hover:underline">
          상품군별 옵션 관리
        </Link>
        에서 옵션을 추가할 때 선택할 수 있습니다.
      </p>

      {message ? (
        <p className={`mt-3 text-xs ${message.ok ? "text-[#111111]" : "text-[#666666]"}`}>{message.text}</p>
      ) : null}

      <div className="mt-5 rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] p-4">
        <p className="text-xs font-medium text-[#111111]">상품군명 단건 등록</p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <label htmlFor="pgr-name" className="text-xs text-[#888888]">
              상품군명
            </label>
            <input
              id="pgr-name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="예: 데스커 베이직 데스크"
              className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111]"
            />
          </div>
          <label className="inline-flex items-center gap-1.5 text-xs text-[#666666]">
            <input
              type="checkbox"
              checked={addUsesOptionRules}
              onChange={(e) => setAddUsesOptionRules(e.target.checked)}
            />
            옵션 관리 사용
          </label>
          <button
            type="button"
            onClick={handleAddOne}
            className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
          >
            등록
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[#666666]">
          「옵션 관리 사용」을 켜면 등록 직후부터 해당 상품군이 상품군별 옵션 관리 화면의 상품군명 목록에 나타납니다.
        </p>
      </div>

      <div className="mt-5 rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] p-4">
        <p className="text-xs font-medium text-[#111111]">상품군명 일괄 등록 (CSV)</p>
        <p className="mt-1 text-xs text-[#666666]">
          첫 열만 사용합니다. 헤더는 <span className="font-mono">상품군명</span>을 권장합니다. 이미 등록된 상품군명은
          실패 사유로 남고 해당 행만 건너뜁니다. Excel 한글 CSV는 UTF-8 인코딩으로 저장하는 것을 권장합니다. 목록에
          글자가 이미 깨져 있다면 해당 행을 삭제한 뒤 올바른 인코딩 파일로 다시 등록해 주세요.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5]"
          >
            양식 다운로드
          </button>
          <label className="cursor-pointer rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5]">
            파일 선택
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            onClick={handleBulk}
            className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-medium text-[#111111] hover:bg-[#F5F5F5]"
          >
            일괄 반영
          </button>
          {bulkFile ? <span className="text-xs text-[#666666]">{bulkFile.name}</span> : null}
        </div>
      </div>

      {bulkFailures.length > 0 ? (
        <div className="mt-4 rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#666666]">
          <p className="font-medium text-[#111111]">일괄 등록 실패 사유</p>
          <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">
            {bulkFailures.map((f) => (
              <li key={`${f.rowLabel}-${f.reason}`}>
                {f.rowLabel}: {f.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E5E5] pt-4">
        <p className="text-xs font-medium text-[#111111]">등록 목록</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadRegistryRaw(sortedEntries)}
            disabled={entries.length === 0}
            className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            RAW 일괄 다운로드
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={entries.length === 0}
            className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            전체 삭제
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-sm border border-[#E5E5E5]">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E5E5E5] bg-[#F5F5F5]">
              <th className="px-3 py-2 text-[11px] font-medium text-[#666666]">상품군명</th>
              <th className="whitespace-nowrap px-3 py-2 text-[11px] font-medium text-[#666666]">
                옵션 관리
              </th>
              <th className="px-3 py-2 text-[11px] font-medium text-[#666666]">관리</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-sm text-[#888888]">
                  등록된 상품군이 없습니다.
                </td>
              </tr>
            ) : (
              sortedEntries.map((row) => (
                <tr key={row.id} className="border-b border-[#E5E5E5] last:border-b-0">
                  <td className="px-3 py-2 text-xs text-[#111111]">
                    {editingId === row.id ? (
                      <input
                        type="text"
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className="w-full min-w-[200px] rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-xs text-[#111111]"
                      />
                    ) : (
                      <span className="block">
                        <span className={looksLikeExcelErrorCell(row.productGroupName) ? "text-[#111111]" : ""}>
                          {row.productGroupName}
                        </span>
                        {looksLikeExcelErrorCell(row.productGroupName) ? (
                          <span className="mt-1 block text-[11px] leading-relaxed text-[#666666]">
                            {EXCEL_ERROR_CELL_HINT}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[#666666]">
                      <input
                        type="checkbox"
                        checked={row.usesOptionRules === true}
                        disabled={editingId === row.id}
                        onChange={(e) => handleToggleUsesOptionRules(row, e.target.checked)}
                        aria-label={`${row.productGroupName} 옵션 관리`}
                      />
                      사용
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {editingId === row.id ? (
                        <>
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="text-xs font-medium text-[#111111] underline-offset-2 hover:underline"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="text-xs text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            className="text-xs text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
                          >
                            편집
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            className="text-xs text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
