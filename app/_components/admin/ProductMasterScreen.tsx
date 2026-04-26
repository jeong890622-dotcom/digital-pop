"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { ProductMasterRow } from "../../_data/mockProductMaster";
import { formatPrice } from "../../_lib/formatPrice";
import { useProductMasterRows } from "../../_lib/productMasterStore";

type FilterState = {
  productGroupCode: string;
  productGroupName: string;
  productName: string;
  productCode: string;
  colorCode: string;
  sizeLabel: string;
};

type ProductCommonDraft = {
  productGroupCode: string;
  productGroupName: string;
  productName: string;
  productCode: string;
  sizeLabel: string;
  consumerPrice: number;
  membershipPrice: number;
  detailUrl: string;
};

type ColorOptionDraft = {
  id: string;
  colorCode: string;
  imageUrl: string;
};

const emptyCommonDraft = (): ProductCommonDraft => ({
  productGroupCode: "",
  productGroupName: "",
  productName: "",
  productCode: "",
  sizeLabel: "",
  consumerPrice: 0,
  membershipPrice: 0,
  detailUrl: "",
});

const emptyColorOption = (id: string): ColorOptionDraft => ({
  id,
  colorCode: "",
  imageUrl: "",
});

type UploadResult = {
  ok: boolean;
  message: string;
};

type UploadSummary = {
  successCount: number;
  failCount: number;
  createdCount: number;
  updatedCount: number;
};

type UploadFailureDetail = {
  rowLabel: string;
  reason: string;
};

type FullUploadMode = "overwrite" | "append" | "upsert";

const FULL_UPLOAD_COLUMNS = [
  "상품군코드",
  "상품군명",
  "제품명",
  "제품코드",
  "색상코드",
  "사이즈",
  "이미지 URL",
  "소비자가",
  "멤버십 가격",
  "상세 URL",
] as const;

const LEGACY_FULL_UPLOAD_COLUMN_COUNT = 9;

const PRICE_UPLOAD_COLUMNS = ["제품코드", "소비자가", "멤버십 가격"] as const;
const LEGACY_PRICE_UPLOAD_COLUMN_COUNT = 2;
const PAGE_SIZE = 20;

function sortRows(a: ProductMasterRow, b: ProductMasterRow): number {
  const g = a.productGroupCode.localeCompare(b.productGroupCode);
  if (g !== 0) return g;
  const p = a.productCode.localeCompare(b.productCode);
  if (p !== 0) return p;
  const c = a.colorCode.localeCompare(b.colorCode);
  if (c !== 0) return c;
  const s = a.sizeLabel.localeCompare(b.sizeLabel);
  if (s !== 0) return s;
  return a.productName.localeCompare(b.productName);
}

function splitUploadLine(line: string): string[] {
  if (line.includes("\t")) {
    return line.split("\t").map((cell) => cell.trim());
  }
  return line.split(",").map((cell) => cell.trim());
}

function parseMembershipPrice(raw: string): number | null {
  const numeric = Number(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }
  return numeric;
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
    reader.readAsText(file, "utf-8");
  });
}

function parseDelimitedLines(rawText: string): string[][] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(splitUploadLine);
}

function downloadTemplate(filename: string, columns: readonly string[]): void {
  const bom = "\uFEFF";
  const header = columns.join(",");
  const content = `${bom}${header}\n`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ProductMasterScreen() {
  const [rows, setRows] = useProductMasterRows();
  const safeRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
  const [filters, setFilters] = useState<FilterState>({
    productGroupCode: "",
    productGroupName: "",
    productName: "",
    productCode: "",
    colorCode: "",
    sizeLabel: "",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingProductCode, setEditingProductCode] = useState<string | null>(null);
  const [commonDraft, setCommonDraft] = useState<ProductCommonDraft>(emptyCommonDraft());
  const [colorOptions, setColorOptions] = useState<ColorOptionDraft[]>([emptyColorOption("co-1")]);
  const [nextColorOptionSeq, setNextColorOptionSeq] = useState(2);
  const [formError, setFormError] = useState<string | null>(null);
  const [fullUploadOpen, setFullUploadOpen] = useState(false);
  const [priceUploadOpen, setPriceUploadOpen] = useState(false);
  const [fullUploadFile, setFullUploadFile] = useState<File | null>(null);
  const [priceUploadFile, setPriceUploadFile] = useState<File | null>(null);
  const [fullUploadMode, setFullUploadMode] = useState<FullUploadMode>("append");
  const [uploadMessage, setUploadMessage] = useState<UploadResult | null>(null);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const [uploadFailureDetails, setUploadFailureDetails] = useState<UploadFailureDetail[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const sortedFilteredRows = useMemo(() => {
    const gq = filters.productGroupCode.trim().toLowerCase();
    const gnq = filters.productGroupName.trim().toLowerCase();
    const pnq = filters.productName.trim().toLowerCase();
    const pq = filters.productCode.trim().toLowerCase();
    const cq = filters.colorCode.trim().toLowerCase();
    const sq = filters.sizeLabel.trim().toLowerCase();

    const filtered = safeRows.filter((row) => {
      if (gq && !row.productGroupCode.toLowerCase().includes(gq)) return false;
      if (gnq && !row.productGroupName.toLowerCase().includes(gnq)) return false;
      if (pnq && !row.productName.toLowerCase().includes(pnq)) return false;
      if (pq && !row.productCode.toLowerCase().includes(pq)) return false;
      if (cq && !row.colorCode.toLowerCase().includes(cq)) return false;
      if (sq && !row.sizeLabel.toLowerCase().includes(sq)) return false;
      return true;
    });

    return [...filtered].sort(sortRows);
  }, [safeRows, filters]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedFilteredRows.length / PAGE_SIZE)),
    [sortedFilteredRows.length],
  );
  const pageStartIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedRows = useMemo(
    () => sortedFilteredRows.slice(pageStartIndex, pageStartIndex + PAGE_SIZE),
    [pageStartIndex, sortedFilteredRows],
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openCreate = () => {
    setFormMode("create");
    setEditingId(null);
    setEditingProductCode(null);
    setCommonDraft(emptyCommonDraft());
    setColorOptions([emptyColorOption("co-1")]);
    setNextColorOptionSeq(2);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (row: ProductMasterRow) => {
    const sameProductRows = safeRows.filter((item) => item.productCode === row.productCode);
    const baseRow = sameProductRows[0] ?? row;
    setFormMode("edit");
    setEditingId(row.id);
    setEditingProductCode(row.productCode);
    setCommonDraft({
      productGroupCode: baseRow.productGroupCode,
      productGroupName: baseRow.productGroupName,
      productName: baseRow.productName,
      productCode: baseRow.productCode,
      sizeLabel: baseRow.sizeLabel,
      consumerPrice: baseRow.consumerPrice,
      membershipPrice: baseRow.membershipPrice,
      detailUrl: baseRow.detailUrl,
    });
    setColorOptions(
      sameProductRows.map((item, index) => ({
        id: `co-${index + 1}`,
        colorCode: item.colorCode,
        imageUrl: item.imageUrl,
      })),
    );
    setNextColorOptionSeq(Math.max(2, sameProductRows.length + 1));
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setEditingProductCode(null);
    setFormError(null);
  };

  const handleDelete = () => {
    if (!editingProductCode) return;
    const confirmed = window.confirm("정말 삭제하시겠습니까?");
    if (!confirmed) return;
    setRows(safeRows.filter((row) => row.productCode !== editingProductCode));
    closeForm();
  };

  const addColorOption = () => {
    setColorOptions((prev) => [...prev, emptyColorOption(`co-${nextColorOptionSeq}`)]);
    setNextColorOptionSeq((prev) => prev + 1);
  };

  const removeColorOption = (id: string) => {
    setColorOptions((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const updateColorOption = (id: string, key: "colorCode" | "imageUrl", value: string) => {
    setColorOptions((prev) =>
      prev.map((option) => (option.id === id ? { ...option, [key]: value } : option)),
    );
  };

  const validate = (): string | null => {
    if (!commonDraft.productGroupCode.trim()) return "상품군 코드를 입력해 주세요.";
    if (!commonDraft.productGroupName.trim()) return "상품군명을 입력해 주세요.";
    if (!commonDraft.productName.trim()) return "제품명을 입력해 주세요.";
    if (!commonDraft.productCode.trim()) return "제품코드를 입력해 주세요.";
    if (!commonDraft.sizeLabel.trim()) return "사이즈를 입력해 주세요.";
    if (!Number.isFinite(commonDraft.consumerPrice) || commonDraft.consumerPrice < 0) {
      return "소비자가는 0 이상의 숫자여야 합니다.";
    }
    if (!Number.isFinite(commonDraft.membershipPrice) || commonDraft.membershipPrice < 0) {
      return "멤버십 가격은 0 이상의 숫자여야 합니다.";
    }
    if (colorOptions.length === 0) return "색상 옵션을 1개 이상 입력해 주세요.";

    const seen = new Set<string>();
    for (const option of colorOptions) {
      if (!option.colorCode.trim()) return "색상코드를 입력해 주세요.";
      if (!option.imageUrl.trim()) return "이미지 URL을 입력해 주세요.";
      const normalized = option.colorCode.trim().toLowerCase();
      if (seen.has(normalized)) return "동일한 색상코드가 중복되었습니다.";
      seen.add(normalized);
    }

    const draftCode = commonDraft.productCode.trim().toLowerCase();
    const draftSize = commonDraft.sizeLabel.trim().toLowerCase();
    if (
      formMode === "create" &&
      safeRows.some((row) =>
        row.productCode.trim().toLowerCase() === draftCode &&
        row.sizeLabel.trim().toLowerCase() === draftSize &&
        colorOptions.some(
          (option) =>
            option.colorCode.trim().toLowerCase() === row.colorCode.trim().toLowerCase(),
        ),
      )
    ) {
      return "동일한 제품코드/사이즈/색상 조합이 이미 등록되어 있습니다.";
    }
    if (
      formMode === "edit" &&
      safeRows.some((row) =>
        row.productCode !== editingProductCode &&
        row.productCode.trim().toLowerCase() === draftCode &&
        row.sizeLabel.trim().toLowerCase() === draftSize &&
        colorOptions.some(
          (option) =>
            option.colorCode.trim().toLowerCase() === row.colorCode.trim().toLowerCase(),
        ),
      )
    ) {
      return "동일한 제품코드/사이즈/색상 조합이 이미 등록되어 있습니다.";
    }

    return null;
  };

  const buildRowsFromDraft = (baseId: string, previousRows: ProductMasterRow[]): ProductMasterRow[] =>
    colorOptions.map((option, index) => ({
      id: previousRows[index]?.id ?? `${baseId}-${index}`,
      productGroupCode: commonDraft.productGroupCode.trim(),
      productGroupName: commonDraft.productGroupName.trim(),
      productName: commonDraft.productName.trim(),
      productCode: commonDraft.productCode.trim(),
      colorCode: option.colorCode.trim(),
      sizeLabel: commonDraft.sizeLabel.trim(),
      imageUrl: option.imageUrl.trim(),
      consumerPrice: commonDraft.consumerPrice,
      membershipPrice: commonDraft.membershipPrice,
      detailUrl: commonDraft.detailUrl.trim(),
    }));

  const handleSave = () => {
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }

    const baseId = `pm-${Date.now()}`;
    const previousRows =
      formMode === "edit" && editingProductCode
        ? safeRows.filter((row) => row.productCode === editingProductCode)
        : [];
    const nextRows = buildRowsFromDraft(baseId, previousRows);

    if (formMode === "create") {
      setRows([...safeRows, ...nextRows]);
    } else if (editingProductCode) {
      setRows([...safeRows.filter((row) => row.productCode !== editingProductCode), ...nextRows]);
    }

    closeForm();
  };

  const applyFullUpload = async () => {
    if (!fullUploadFile) {
      setUploadMessage({ ok: false, message: "업로드할 파일을 선택해 주세요." });
      setUploadSummary(null);
      setUploadFailureDetails([]);
      return;
    }
    const text = await readTextFile(fullUploadFile).catch(() => "");
    const rows = parseDelimitedLines(text);
    if (rows.length === 0) {
      setUploadMessage({ ok: false, message: "파일 데이터가 비어 있습니다." });
      setUploadSummary(null);
      setUploadFailureDetails([]);
      return;
    }

    const firstCells = rows[0]!;
    const hasHeader = firstCells[0] === FULL_UPLOAD_COLUMNS[0];
    const bodyRows = hasHeader ? rows.slice(1) : rows;
    if (bodyRows.length === 0) {
      setUploadMessage({ ok: false, message: "헤더를 제외한 데이터 행이 없습니다." });
      setUploadSummary(null);
      setUploadFailureDetails([]);
      return;
    }

    const parsed: ProductMasterRow[] = [];
    let failCount = 0;
    const failures: UploadFailureDetail[] = [];
    for (let i = 0; i < bodyRows.length; i += 1) {
      const cells = bodyRows[i]!;
      const colCount = cells.length;
      const expectedNew = FULL_UPLOAD_COLUMNS.length;
      if (colCount !== expectedNew && colCount !== LEGACY_FULL_UPLOAD_COLUMN_COUNT) {
        failCount += 1;
        failures.push({
          rowLabel: `${i + 1}행`,
          reason: `컬럼 수 불일치 (기대 ${expectedNew} 또는 구버전 ${LEGACY_FULL_UPLOAD_COLUMN_COUNT}, 실제 ${colCount})`,
        });
        continue;
      }

      let consumerPrice: number;
      let membershipPrice: number;
      let detailUrl: string;

      if (colCount === expectedNew) {
        const parsedConsumer = parseMembershipPrice(cells[7] ?? "");
        const parsedMembership = parseMembershipPrice(cells[8] ?? "");
        if (parsedConsumer === null) {
          failCount += 1;
          failures.push({
            rowLabel: `${i + 1}행`,
            reason: "소비자가 형식 오류",
          });
          continue;
        }
        if (parsedMembership === null) {
          failCount += 1;
          failures.push({
            rowLabel: `${i + 1}행`,
            reason: "멤버십 가격 형식 오류",
          });
          continue;
        }
        consumerPrice = parsedConsumer;
        membershipPrice = parsedMembership;
        detailUrl = cells[9] ?? "";
      } else {
        const parsedMembership = parseMembershipPrice(cells[7] ?? "");
        if (parsedMembership === null) {
          failCount += 1;
          failures.push({
            rowLabel: `${i + 1}행`,
            reason: "멤버십 가격 형식 오류",
          });
          continue;
        }
        consumerPrice = 0;
        membershipPrice = parsedMembership;
        detailUrl = cells[8] ?? "";
      }

      const row: ProductMasterRow = {
        id: `pm-upload-${Date.now()}-${i}`,
        productGroupCode: cells[0] ?? "",
        productGroupName: cells[1] ?? "",
        productName: cells[2] ?? "",
        productCode: cells[3] ?? "",
        colorCode: cells[4] ?? "",
        sizeLabel: cells[5] ?? "",
        imageUrl: cells[6] ?? "",
        consumerPrice,
        membershipPrice,
        detailUrl,
      };
      if (
        !row.productGroupCode ||
        !row.productGroupName ||
        !row.productName ||
        !row.productCode ||
        !row.colorCode ||
        !row.sizeLabel ||
        !row.imageUrl
      ) {
        failCount += 1;
        failures.push({
          rowLabel: `${i + 1}행`,
          reason: "필수값 누락 (상품군코드/상품군명/제품명/제품코드/색상코드/사이즈/이미지 URL)",
        });
        continue;
      }
      parsed.push(row);
    }

    if (parsed.length === 0) {
      setUploadMessage({ ok: false, message: "유효한 데이터가 없어 업로드에 실패했습니다." });
      setUploadSummary({
        successCount: 0,
        failCount,
        createdCount: 0,
        updatedCount: 0,
      });
      setUploadFailureDetails(failures);
      return;
    }

    const uploadedRows = parsed.map((row, index) => ({
      ...row,
      id: `pm-upload-${Date.now()}-${index}`,
    }));
    const prevMap = new Map<string, ProductMasterRow>(
      safeRows.map((row) => [
        `${row.productCode.toLowerCase()}|${row.colorCode.toLowerCase()}|${row.sizeLabel.toLowerCase()}`,
        row,
      ]),
    );
    const uploadMap = new Map<string, ProductMasterRow>();
    for (const row of uploadedRows) {
      const key = `${row.productCode.toLowerCase()}|${row.colorCode.toLowerCase()}|${row.sizeLabel.toLowerCase()}`;
      uploadMap.set(key, row);
    }

    let createdCount = 0;
    let updatedCount = 0;
    let finalRows: ProductMasterRow[] = [];

    if (fullUploadMode === "overwrite") {
      finalRows = [...uploadMap.entries()].map(([key, row]) => {
        const existing = prevMap.get(key);
        if (existing) {
          updatedCount += 1;
          return { ...row, id: existing.id };
        }
        createdCount += 1;
        return row;
      });
    } else if (fullUploadMode === "append") {
      const appendRows: ProductMasterRow[] = [];
      for (const [key, row] of uploadMap.entries()) {
        if (prevMap.has(key)) {
          continue;
        }
        createdCount += 1;
        appendRows.push(row);
      }
      finalRows = [...safeRows, ...appendRows];
    } else {
      const merged = new Map(prevMap);
      for (const [key, row] of uploadMap.entries()) {
        const existing = merged.get(key);
        if (existing) {
          updatedCount += 1;
          merged.set(key, { ...row, id: existing.id });
        } else {
          createdCount += 1;
          merged.set(key, row);
        }
      }
      finalRows = [...merged.values()];
    }

    setRows(finalRows);
    setUploadSummary({
      successCount: fullUploadMode === "overwrite" ? finalRows.length : createdCount + updatedCount,
      failCount,
      createdCount,
      updatedCount,
    });
    setUploadFailureDetails(failures);
    setUploadMessage({
      ok: true,
      message:
        fullUploadMode === "overwrite"
          ? "상품 전체 업로드(덮어쓰기)를 반영했습니다."
          : fullUploadMode === "append"
            ? "상품 전체 업로드(추가)를 반영했습니다."
            : "상품 전체 업로드(병합)를 반영했습니다.",
    });
    setFullUploadOpen(false);
    setFullUploadFile(null);
  };

  const applyPriceUpload = async () => {
    if (!priceUploadFile) {
      setUploadMessage({ ok: false, message: "업로드할 파일을 선택해 주세요." });
      setUploadSummary(null);
      setUploadFailureDetails([]);
      return;
    }
    const text = await readTextFile(priceUploadFile).catch(() => "");
    const rows = parseDelimitedLines(text);
    if (rows.length === 0) {
      setUploadMessage({ ok: false, message: "파일 데이터가 비어 있습니다." });
      setUploadSummary(null);
      setUploadFailureDetails([]);
      return;
    }

    const firstCells = rows[0]!;
    const hasHeader = firstCells[0] === PRICE_UPLOAD_COLUMNS[0];
    const bodyRows = hasHeader ? rows.slice(1) : rows;
    if (bodyRows.length === 0) {
      setUploadMessage({ ok: false, message: "헤더를 제외한 데이터 행이 없습니다." });
      setUploadSummary(null);
      setUploadFailureDetails([]);
      return;
    }

    const priceByCode = new Map<
      string,
      { membershipPrice: number; consumerPrice?: number }
    >();
    let failCount = 0;
    for (let i = 0; i < bodyRows.length; i += 1) {
      const cells = bodyRows[i]!;
      const len = cells.length;
      if (len !== PRICE_UPLOAD_COLUMNS.length && len !== LEGACY_PRICE_UPLOAD_COLUMN_COUNT) {
        failCount += 1;
        continue;
      }
      const productCode = (cells[0] ?? "").trim();
      if (!productCode) {
        failCount += 1;
        continue;
      }
      const key = productCode.toLowerCase();
      if (len === PRICE_UPLOAD_COLUMNS.length) {
        const consumer = parseMembershipPrice(cells[1] ?? "");
        const membership = parseMembershipPrice(cells[2] ?? "");
        if (consumer === null || membership === null) {
          failCount += 1;
          continue;
        }
        priceByCode.set(key, { consumerPrice: consumer, membershipPrice: membership });
      } else {
        const membership = parseMembershipPrice(cells[1] ?? "");
        if (membership === null) {
          failCount += 1;
          continue;
        }
        priceByCode.set(key, { membershipPrice: membership });
      }
    }

    let updateCount = 0;
    const nextRows = safeRows.map((row) => {
      const entry = priceByCode.get(row.productCode.toLowerCase());
      if (!entry) {
        return row;
      }
      updateCount += 1;
      return {
        ...row,
        membershipPrice: entry.membershipPrice,
        consumerPrice: entry.consumerPrice ?? row.consumerPrice,
      };
    });

    setRows(nextRows);
    setUploadSummary({
      successCount: updateCount,
      failCount,
      createdCount: 0,
      updatedCount: updateCount,
    });
    setUploadFailureDetails([]);
    setUploadMessage({
      ok: true,
      message: "가격 일괄 수정을 반영했습니다.",
    });
    setPriceUploadOpen(false);
    setPriceUploadFile(null);
  };

  const resetFilters = () => {
    setFilters({
      productGroupCode: "",
      productGroupName: "",
      productName: "",
      productCode: "",
      colorCode: "",
      sizeLabel: "",
    });
  };

  const thCls = "px-2 py-2 text-left text-[11px] font-medium text-[#666666] whitespace-nowrap";
  const tdCls = "px-2 py-2 align-top text-xs text-[#111111]";

  const downloadRawProductRows = () => {
    const header = FULL_UPLOAD_COLUMNS.join(",");
    const lines = safeRows.map((row) =>
      [
        row.productGroupCode,
        row.productGroupName,
        row.productName,
        row.productCode,
        row.colorCode,
        row.sizeLabel,
        row.imageUrl,
        String(row.consumerPrice),
        String(row.membershipPrice),
        row.detailUrl,
      ]
        .map((value) => csvEscape(value))
        .join(","),
    );
    const bom = "\uFEFF";
    const content = `${bom}${header}\n${lines.join("\n")}\n`;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "product-master-raw-data.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-[#E5E5E5] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#111111]">상품 마스터</h1>
          <p className="mt-0.5 text-sm text-[#666666]">
            사용자 화면 상품 데이터의 원천(source of truth)이며, 내부 저장 기준은 1행 = 1
            SKU/옵션입니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setUploadMessage(null);
              setUploadSummary(null);
              setUploadFailureDetails([]);
                setFullUploadMode("append");
              setFullUploadOpen(true);
            }}
            className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-medium text-[#111111] hover:bg-[#F5F5F5]"
          >
            상품 전체 업로드
          </button>
          <button
            type="button"
            onClick={() => {
              setUploadMessage(null);
              setUploadSummary(null);
              setUploadFailureDetails([]);
              setPriceUploadOpen(true);
            }}
            className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-medium text-[#111111] hover:bg-[#F5F5F5]"
          >
            가격 일괄 수정
          </button>
          <button
            type="button"
            onClick={downloadRawProductRows}
            className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-medium text-[#111111] hover:bg-[#F5F5F5]"
          >
            raw 데이터 다운로드
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
          >
            등록
          </button>
        </div>
      </div>

      {uploadMessage ? (
        <p className={`mt-3 text-xs ${uploadMessage.ok ? "text-[#111111]" : "text-[#666666]"}`}>
          {uploadMessage.message}
        </p>
      ) : null}
      {uploadSummary ? (
        <div className="mt-2 rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-3 py-2 text-xs text-[#666666]">
          <p>성공 건수: {uploadSummary.successCount}</p>
          <p>실패 건수: {uploadSummary.failCount}</p>
          <p>수정 건수: {uploadSummary.updatedCount}</p>
          <p>신규 건수: {uploadSummary.createdCount}</p>
        </div>
      ) : null}
      {uploadFailureDetails.length > 0 ? (
        <div className="mt-2 rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#666666]">
          <p className="font-medium text-[#111111]">실패 사유</p>
          <ul className="mt-1 space-y-1">
            {uploadFailureDetails.map((detail) => (
              <li key={`${detail.rowLabel}-${detail.reason}`}>
                {detail.rowLabel}: {detail.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {fullUploadOpen ? (
        <section className="mt-4 rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-[#111111]">상품 전체 업로드</h2>
            <button
              type="button"
              onClick={() => setFullUploadOpen(false)}
              className="text-xs text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
            >
              닫기
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadTemplate("product-master-upload-template.csv", FULL_UPLOAD_COLUMNS)}
              className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5]"
            >
              엑셀양식 다운로드
            </button>
            <label className="cursor-pointer rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5]">
              파일 선택
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => setFullUploadFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <span className="text-xs text-[#666666]">
              {fullUploadFile ? fullUploadFile.name : "선택된 파일 없음"}
            </span>
            <button
              type="button"
              onClick={applyFullUpload}
              className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
            >
              업로드 실행
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#666666]">
            <span>업로드 방식</span>
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="full-upload-mode"
                checked={fullUploadMode === "overwrite"}
                onChange={() => setFullUploadMode("overwrite")}
              />
              덮어쓰기
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="full-upload-mode"
                checked={fullUploadMode === "append"}
                onChange={() => setFullUploadMode("append")}
              />
              추가
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="full-upload-mode"
                checked={fullUploadMode === "upsert"}
                onChange={() => setFullUploadMode("upsert")}
              />
              병합
            </label>
          </div>
          <details className="mt-3 text-xs text-[#666666]">
            <summary className="cursor-pointer">보조 설명</summary>
            <p className="mt-2">
              컬럼: 상품군코드, 상품군명, 제품명, 제품코드, 색상코드, 사이즈, 이미지 URL, 소비자가,
              멤버십 가격, 상세 URL (구버전 9열 파일은 소비자가 0으로 처리)
            </p>
            <p className="mt-1">
              업로드 결과는 상품 마스터와 사용자 화면(source of truth)에 동시에 반영됩니다.
            </p>
            <p className="mt-1">
              덮어쓰기: 파일 기준으로 전체 교체 / 추가: 신규 키만 추가 / 병합: 기존 유지 + 파일 데이터
              수정·추가
            </p>
          </details>
        </section>
      ) : null}

      {priceUploadOpen ? (
        <section className="mt-4 rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-[#111111]">가격 일괄 수정</h2>
            <button
              type="button"
              onClick={() => setPriceUploadOpen(false)}
              className="text-xs text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
            >
              닫기
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadTemplate("product-price-update-template.csv", PRICE_UPLOAD_COLUMNS)}
              className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5]"
            >
              엑셀양식 다운로드
            </button>
            <label className="cursor-pointer rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5]">
              파일 선택
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => setPriceUploadFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <span className="text-xs text-[#666666]">
              {priceUploadFile ? priceUploadFile.name : "선택된 파일 없음"}
            </span>
            <button
              type="button"
              onClick={applyPriceUpload}
              className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
            >
              업로드 실행
            </button>
          </div>
          <details className="mt-3 text-xs text-[#666666]">
            <summary className="cursor-pointer">보조 설명</summary>
            <p className="mt-2">
              컬럼: 제품코드, 소비자가, 멤버십 가격 (구버전 2열: 제품코드, 멤버십 가격만 — 소비자가는
              유지)
            </p>
            <p className="mt-1">
              반영 결과는 상품 마스터와 사용자 화면 가격 계산에 동시에 반영됩니다.
            </p>
          </details>
        </section>
      ) : null}

      <section className="mt-5 border-b border-[#E5E5E5] pb-4">
        <p className="text-xs font-medium text-[#888888]">검색 · 필터</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          {(
            [
              ["pgc", "상품군 코드", filters.productGroupCode, "productGroupCode"],
              ["pgn", "상품군명", filters.productGroupName, "productGroupName"],
              ["pn", "제품명", filters.productName, "productName"],
              ["pc", "제품코드", filters.productCode, "productCode"],
              ["cc", "색상코드", filters.colorCode, "colorCode"],
              ["sl", "사이즈", filters.sizeLabel, "sizeLabel"],
            ] as const
          ).map(([fid, label, value, key]) => (
            <div key={fid} className="flex min-w-[120px] flex-col gap-1">
              <label htmlFor={`pm-f-${fid}`} className="text-xs text-[#888888]">
                {label}
              </label>
              <input
                id={`pm-f-${fid}`}
                type="search"
                value={value}
                onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                onInput={() => setCurrentPage(1)}
                placeholder="포함"
                className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111] placeholder:text-[#888888]"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#666666] hover:text-[#111111]"
          >
            초기화
          </button>
        </div>
      </section>

      <div className="mt-4 overflow-x-auto rounded-sm border border-[#E5E5E5]">
        <table className="w-full min-w-[1040px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E5E5E5] bg-[#F5F5F5]">
              <th className={thCls}>상품군 코드</th>
              <th className={thCls}>상품군명</th>
              <th className={thCls}>제품명</th>
              <th className={thCls}>제품코드</th>
              <th className={thCls}>색상코드</th>
              <th className={thCls}>사이즈</th>
              <th className={thCls}>이미지 URL</th>
              <th className={thCls}>소비자가</th>
              <th className={thCls}>멤버십 가격</th>
              <th className={thCls}>상세 URL</th>
              <th className={thCls}>작업</th>
            </tr>
          </thead>
          <tbody>
            {sortedFilteredRows.length === 0 ? (
              <tr>
                <td className="px-3 py-10 text-center text-sm text-[#888888]" colSpan={11}>
                  조건에 맞는 행이 없습니다.
                </td>
              </tr>
            ) : (
              pagedRows.map((row, idx) => {
                const globalIndex = pageStartIndex + idx;
                const prev =
                  globalIndex > 0 ? sortedFilteredRows[globalIndex - 1]!.productGroupCode : null;
                const showGroupHeader = row.productGroupCode !== prev;
                return (
                  <Fragment key={row.id}>
                    {showGroupHeader ? (
                      <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
                        <td colSpan={11} className="px-3 py-2 text-xs font-medium text-[#666666]">
                          <span className="font-mono text-[#111111]">{row.productGroupCode}</span>
                          <span className="mx-2 text-[#E5E5E5]">|</span>
                          {row.productGroupName}
                        </td>
                      </tr>
                    ) : null}
                    <tr className="border-b border-[#E5E5E5] last:border-b-0">
                      <td className={`${tdCls} font-mono text-[#666666]`}>{row.productGroupCode}</td>
                      <td className={tdCls}>{row.productGroupName}</td>
                      <td className={tdCls}>{row.productName}</td>
                      <td className={`${tdCls} font-mono`}>{row.productCode}</td>
                      <td className={`${tdCls} font-mono text-[#666666]`}>{row.colorCode}</td>
                      <td className={tdCls}>{row.sizeLabel}</td>
                      <td className={`${tdCls} max-w-[120px]`}>
                        <span className="block truncate font-mono text-[#666666]" title={row.imageUrl}>
                          {row.imageUrl}
                        </span>
                      </td>
                      <td className={tdCls}>{formatPrice(row.consumerPrice)}</td>
                      <td className={tdCls}>{formatPrice(row.membershipPrice)}</td>
                      <td className={`${tdCls} max-w-[140px]`}>
                        {row.detailUrl ? (
                          <span className="block truncate font-mono text-[#666666]" title={row.detailUrl}>
                            {row.detailUrl}
                          </span>
                        ) : (
                          <span className="text-[#888888]">—</span>
                        )}
                      </td>
                      <td className={tdCls}>
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="text-xs font-medium text-[#111111] underline-offset-2 hover:underline"
                        >
                          수정
                        </button>
                      </td>
                    </tr>
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {sortedFilteredRows.length > 0 ? (
        <div className="mt-3 flex items-center justify-between text-xs text-[#666666]">
          <p>
            총 {sortedFilteredRows.length}건 · {currentPage}/{totalPages} 페이지
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1 disabled:opacity-40"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
      ) : null}

      {formOpen ? (
        <section className="mt-6 rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] p-4">
          <div className="flex items-center justify-between gap-2 border-b border-[#E5E5E5] pb-3">
            <h2 className="text-sm font-semibold text-[#111111]">
              {formMode === "create" ? "제품 등록" : "제품 수정"}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="text-xs text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
            >
              닫기
            </button>
          </div>
          {formError ? (
            <p className="mt-3 text-xs text-[#111111]" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="mt-4 rounded-sm border border-[#E5E5E5] bg-white p-3">
            <p className="text-xs font-medium text-[#666666]">공통 정보</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="pm-d-pgc" className="text-xs text-[#888888]">
                  상품군 코드
                </label>
                <input
                  id="pm-d-pgc"
                  value={commonDraft.productGroupCode}
                  onChange={(e) => setCommonDraft((d) => ({ ...d, productGroupCode: e.target.value }))}
                  className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor="pm-d-pgn" className="text-xs text-[#888888]">
                  상품군명
                </label>
                <input
                  id="pm-d-pgn"
                  value={commonDraft.productGroupName}
                  onChange={(e) => setCommonDraft((d) => ({ ...d, productGroupName: e.target.value }))}
                  className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
                <label htmlFor="pm-d-pn" className="text-xs text-[#888888]">
                  제품명
                </label>
                <input
                  id="pm-d-pn"
                  value={commonDraft.productName}
                  onChange={(e) => setCommonDraft((d) => ({ ...d, productName: e.target.value }))}
                  className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pm-d-pcode" className="text-xs text-[#888888]">
                  제품코드
                </label>
                <input
                  id="pm-d-pcode"
                  value={commonDraft.productCode}
                  onChange={(e) => setCommonDraft((d) => ({ ...d, productCode: e.target.value }))}
                  className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pm-d-sl" className="text-xs text-[#888888]">
                  사이즈
                </label>
                <input
                  id="pm-d-sl"
                  value={commonDraft.sizeLabel}
                  onChange={(e) => setCommonDraft((d) => ({ ...d, sizeLabel: e.target.value }))}
                  className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pm-d-consumer" className="text-xs text-[#888888]">
                  소비자가 (원)
                </label>
                <input
                  id="pm-d-consumer"
                  type="number"
                  min={0}
                  step={1000}
                  value={commonDraft.consumerPrice || ""}
                  onChange={(e) =>
                    setCommonDraft((d) => ({
                      ...d,
                      consumerPrice: Number(e.target.value) || 0,
                    }))
                  }
                  className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="pm-d-price" className="text-xs text-[#888888]">
                  멤버십 가격 (원)
                </label>
                <input
                  id="pm-d-price"
                  type="number"
                  min={0}
                  step={1000}
                  value={commonDraft.membershipPrice || ""}
                  onChange={(e) =>
                    setCommonDraft((d) => ({
                      ...d,
                      membershipPrice: Number(e.target.value) || 0,
                    }))
                  }
                  className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
                <label htmlFor="pm-d-detail" className="text-xs text-[#888888]">
                  상세 URL (선택)
                </label>
                <input
                  id="pm-d-detail"
                  value={commonDraft.detailUrl}
                  onChange={(e) => setCommonDraft((d) => ({ ...d, detailUrl: e.target.value }))}
                  className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-sm border border-[#E5E5E5] bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-[#666666]">색상 옵션</p>
              <button
                type="button"
                onClick={addColorOption}
                className="rounded-sm border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs text-[#111111]"
              >
                색상 추가
              </button>
            </div>
            <p className="mt-2 text-xs text-[#888888]">
              색상 추가를 통해 제품 1건에 여러 색상 옵션을 입력하면 저장 시 SKU 행이 각각 생성됩니다.
            </p>
            <div className="mt-3 space-y-3">
              {colorOptions.map((option, index) => (
                <div key={option.id} className="rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-[#666666]">색상 옵션 {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeColorOption(option.id)}
                      className="text-xs text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
                      disabled={colorOptions.length === 1}
                    >
                      삭제
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`pm-c-code-${option.id}`} className="text-xs text-[#888888]">
                        색상코드
                      </label>
                      <input
                        id={`pm-c-code-${option.id}`}
                        value={option.colorCode}
                        onChange={(e) => updateColorOption(option.id, "colorCode", e.target.value)}
                        className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`pm-c-img-${option.id}`} className="text-xs text-[#888888]">
                        이미지 URL
                      </label>
                      <input
                        id={`pm-c-img-${option.id}`}
                        value={option.imageUrl}
                        onChange={(e) => updateColorOption(option.id, "imageUrl", e.target.value)}
                        className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#E5E5E5] pt-4">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#666666] hover:text-[#111111]"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
            >
              저장
            </button>
            {formMode === "edit" ? (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5]"
              >
                삭제
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
