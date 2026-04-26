"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { adminHref } from "../../_components/admin/adminHref";
import {
  MOCK_STORE_ADMIN_STORE_ID,
  type MockStore,
} from "../../_data/adminNavigation";
import { useAdminAccountState } from "../../_lib/adminAccountStore";
import { useStoreOperationRows } from "../../_lib/storeOperationStore";
import type { AdminRole } from "../../_types/admin";

type OperationTabId = "merchandising" | "qr" | "managers";
type ZoneMerchRow = {
  storeId: string;
  zone: string;
  productCode: string;
  colorCode: string;
};
type UploadSummary = {
  successCount: number;
  failCount: number;
  createdCount: number;
  updatedCount: number;
};
type ZoneRowSortOption = "zone-asc" | "zone-desc" | "product-asc" | "product-desc";

type ZoneQrEntry = {
  storeId: string;
  zone: string;
  zoneId: string;
  qrId: string;
  qrUrl: string;
  qrImageUrl: string;
  generatedAt: string;
};

type ZoneQrByStore = Record<string, Record<string, ZoneQrEntry>>;

const ZONE_MERCH_COLUMNS = ["ZONE", "제품코드", "색상"] as const;
const QR_STORAGE_KEY = "digital-pop:store-zone-qrs";

function parseRole(raw: string | null): AdminRole {
  return raw === "store" ? "store" : "master";
}

function parseTab(raw: string | null): OperationTabId {
  if (raw === "merchandising" || raw === "qr" || raw === "managers") {
    return raw;
  }
  return "merchandising";
}

function tabTitle(tab: OperationTabId): string {
  if (tab === "merchandising") {
    return "존·구역 및 상품 편성";
  }
  if (tab === "qr") {
    return "QR 관리";
  }
  if (tab === "managers") {
    return "매장 관리자 계정";
  }
  return "존·구역 및 상품 편성";
}

function splitUploadLine(line: string): string[] {
  if (line.includes("\t")) {
    return line.split("\t").map((cell) => cell.trim());
  }
  return line.split(",").map((cell) => cell.trim());
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("파일 읽기에 실패했습니다."));
    reader.readAsText(file, "utf-8");
  });
}

function downloadTemplate(filename: string, columns: readonly string[]): void {
  const bom = "\uFEFF";
  const header = columns.join(",");
  const blob = new Blob([`${bom}${header}\n`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function zoneIdFromLabel(label: string): string {
  const normalized = label.trim().toLowerCase();
  return `zone-${normalized.replace(/\s+/g, "-")}`;
}

function getInitialZoneQrState(): ZoneQrByStore {
  if (typeof window === "undefined") {
    return {};
  }
  const raw = window.localStorage.getItem(QR_STORAGE_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as ZoneQrByStore;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    window.localStorage.removeItem(QR_STORAGE_KEY);
  }
  return {};
}

export default function AdminOperationsPage() {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const searchParams = useSearchParams();
  const role = useMemo(() => parseRole(searchParams.get("role")), [searchParams]);
  const [adminState] = useAdminAccountState();
  const stores = adminState.stores;
  const selectedStoreId = useMemo(() => {
    if (role === "store") {
      return MOCK_STORE_ADMIN_STORE_ID;
    }
    return searchParams.get("storeId") ?? stores[0]?.id ?? MOCK_STORE_ADMIN_STORE_ID;
  }, [role, searchParams, stores]);
  const selectedStore = useMemo<MockStore | undefined>(
    () => stores.find((store) => store.id === selectedStoreId),
    [selectedStoreId, stores],
  );
  const tab = useMemo(() => parseTab(searchParams.get("tab")), [searchParams]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const [savedRowsByStore, setSavedRowsByStore] = useStoreOperationRows();
  const [entryModalMode, setEntryModalMode] = useState<"create" | "edit" | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [zoneDraft, setZoneDraft] = useState("");
  const [productCodeDraft, setProductCodeDraft] = useState("");
  const [colorCodeDraft, setColorCodeDraft] = useState("");
  const [entryError, setEntryError] = useState<string | null>(null);
  const [deletePolicyMessage, setDeletePolicyMessage] = useState<string | null>(null);
  const [zoneQrByStore, setZoneQrByStore] = useState<ZoneQrByStore>(getInitialZoneQrState);
  const [qrMessage, setQrMessage] = useState<string | null>(null);
  const [zoneFilter, setZoneFilter] = useState("all");
  const [zoneRowSort, setZoneRowSort] = useState<ZoneRowSortOption>("zone-asc");

  const zoneRows = useMemo(
    () => savedRowsByStore[selectedStoreId] ?? [],
    [savedRowsByStore, selectedStoreId],
  );
  const registeredZones = useMemo(
    () => [...new Set(zoneRows.map((row) => row.zone.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [zoneRows],
  );
  const visibleZoneRows = useMemo(() => {
    const filtered =
      zoneFilter === "all"
        ? zoneRows
        : zoneRows.filter((row) => row.zone.trim().toLowerCase() === zoneFilter.toLowerCase());

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (zoneRowSort === "zone-asc") {
        return a.zone.localeCompare(b.zone);
      }
      if (zoneRowSort === "zone-desc") {
        return b.zone.localeCompare(a.zone);
      }
      if (zoneRowSort === "product-asc") {
        const byProduct = a.productCode.localeCompare(b.productCode);
        return byProduct !== 0 ? byProduct : a.zone.localeCompare(b.zone);
      }
      const byProduct = b.productCode.localeCompare(a.productCode);
      return byProduct !== 0 ? byProduct : a.zone.localeCompare(b.zone);
    });
    return sorted;
  }, [zoneFilter, zoneRowSort, zoneRows]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(QR_STORAGE_KEY, JSON.stringify(zoneQrByStore));
  }, [zoneQrByStore]);

  const tabs = useMemo(
    () =>
      role === "master"
        ? [
            { id: "merchandising" as const, label: "존·구역 및 상품 편성" },
            { id: "qr" as const, label: "QR 관리" },
            { id: "managers" as const, label: "매장 관리자 계정" },
          ]
        : [
            { id: "merchandising" as const, label: "존·구역 및 상품 편성" },
            { id: "qr" as const, label: "QR 관리" },
          ],
    [role],
  );
  const safeTab = tabs.some((t) => t.id === tab) ? tab : "merchandising";

  if (!isMounted) {
    return (
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E5E5E5] pb-4">
          <div>
            <h1 className="text-lg font-semibold text-[#111111]">매장 운영</h1>
            <p className="mt-1 text-sm text-[#666666]">화면을 불러오는 중입니다.</p>
          </div>
        </div>
      </section>
    );
  }

  const applyZoneMerchUpload = async () => {
    if (!uploadFile) {
      setUploadMessage("업로드할 파일을 선택해 주세요.");
      setUploadSummary(null);
      return;
    }
    const text = await readTextFile(uploadFile).catch(() => "");
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) {
      setUploadMessage("파일 데이터가 비어 있습니다.");
      setUploadSummary(null);
      return;
    }

    const firstCells = splitUploadLine(lines[0] ?? "");
    const hasHeader = firstCells[0] === ZONE_MERCH_COLUMNS[0];
    const bodyLines = hasHeader ? lines.slice(1) : lines;
    if (bodyLines.length === 0) {
      setUploadMessage("헤더를 제외한 데이터가 없습니다.");
      setUploadSummary(null);
      return;
    }

    const parsed: ZoneMerchRow[] = [];
    let failCount = 0;
    for (const line of bodyLines) {
      const cells = splitUploadLine(line);
      if (cells.length !== ZONE_MERCH_COLUMNS.length) {
        failCount += 1;
        continue;
      }
      const row = {
        storeId: selectedStoreId,
        zone: (cells[0] ?? "").trim(),
        productCode: (cells[1] ?? "").trim(),
        colorCode: (cells[2] ?? "").trim(),
      };
      if (!row.zone || !row.productCode || !row.colorCode) {
        failCount += 1;
        continue;
      }
      parsed.push(row);
    }

    const prevRows = savedRowsByStore[selectedStoreId] ?? [];
    const prevMap = new Map(prevRows.map((row) => [`${row.zone}|${row.productCode}|${row.colorCode}`, row]));
    let createdCount = 0;
    let updatedCount = 0;
    const dedup = new Map<string, ZoneMerchRow>();
    for (const row of parsed) {
      const key = `${row.zone}|${row.productCode}|${row.colorCode}`;
      if (prevMap.has(key)) {
        updatedCount += 1;
      } else {
        createdCount += 1;
      }
      dedup.set(key, row);
    }
    const nextRows = [...dedup.values()];
    setSavedRowsByStore({ ...savedRowsByStore, [selectedStoreId]: nextRows });
    setUploadSummary({
      successCount: nextRows.length,
      failCount,
      createdCount,
      updatedCount,
    });
    setUploadMessage("업로드 실행 완료. 자동 저장되었습니다.");
    setUploadFile(null);
  };

  const openCreateEntryModal = () => {
    setEntryModalMode("create");
    setEditingKey(null);
    setZoneDraft("");
    setProductCodeDraft("");
    setColorCodeDraft("");
    setEntryError(null);
  };

  const openEditEntryModal = (row: ZoneMerchRow) => {
    setEntryModalMode("edit");
    setEditingKey(`${row.zone}|${row.productCode}|${row.colorCode}`);
    setZoneDraft(row.zone);
    setProductCodeDraft(row.productCode);
    setColorCodeDraft(row.colorCode);
    setEntryError(null);
  };

  const closeEntryModal = () => {
    setEntryModalMode(null);
    setEditingKey(null);
    setEntryError(null);
  };

  const saveEntry = () => {
    const nextZone = zoneDraft.trim();
    const nextProductCode = productCodeDraft.trim();
    const nextColorCode = colorCodeDraft.trim();
    if (!nextZone || !nextProductCode || !nextColorCode) {
      setEntryError("ZONE, 제품코드, 색상을 모두 입력해 주세요.");
      return;
    }

    const nextKey = `${nextZone}|${nextProductCode}|${nextColorCode}`;
    if (
      zoneRows.some(
        (row) =>
          `${row.zone}|${row.productCode}|${row.colorCode}` === nextKey &&
          (entryModalMode !== "edit" || nextKey !== editingKey),
      )
    ) {
      setEntryError("동일한 ZONE/제품코드/색상 조합이 이미 등록되어 있습니다.");
      return;
    }

    if (entryModalMode === "create") {
      setSavedRowsByStore({
        ...savedRowsByStore,
        [selectedStoreId]: [
          ...zoneRows,
          {
            storeId: selectedStoreId,
            zone: nextZone,
            productCode: nextProductCode,
            colorCode: nextColorCode,
          },
        ],
      });
    } else if (entryModalMode === "edit" && editingKey) {
      setSavedRowsByStore({
        ...savedRowsByStore,
        [selectedStoreId]: zoneRows.map((row) =>
          `${row.zone}|${row.productCode}|${row.colorCode}` === editingKey
            ? {
                storeId: selectedStoreId,
                zone: nextZone,
                productCode: nextProductCode,
                colorCode: nextColorCode,
              }
            : row,
        ),
      });
    }
    closeEntryModal();
  };

  const deleteEntry = (row: ZoneMerchRow) => {
    setDeletePolicyMessage(null);
    if (role === "store") {
      const zoneRowsCount = zoneRows.filter((item) => item.zone === row.zone).length;
      if (zoneRowsCount <= 1) {
        setDeletePolicyMessage(
          "매장 관리자는 ZONE의 마지막 상품을 삭제할 수 없습니다. 해당 ZONE에는 최소 1개 이상의 상품이 유지되어야 합니다.",
        );
        return;
      }
    }
    const confirmed = window.confirm("정말 삭제하시겠습니까?");
    if (!confirmed) return;
    const targetKey = `${row.zone}|${row.productCode}|${row.colorCode}`;
    setSavedRowsByStore({
      ...savedRowsByStore,
      [selectedStoreId]: zoneRows.filter(
        (item) => `${item.zone}|${item.productCode}|${item.colorCode}` !== targetKey,
      ),
    });
  };

  const createQrForZone = (zone: string) => {
    const zoneId = zoneIdFromLabel(zone);
    const qrId = `qr-${selectedStoreId}-${zoneId}`;
    const baseUrl =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const qrUrl = `${baseUrl}/?qrId=${encodeURIComponent(qrId)}&storeId=${encodeURIComponent(
      selectedStoreId,
    )}&zoneId=${encodeURIComponent(zoneId)}&areaId=${encodeURIComponent(zoneId)}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
      qrUrl,
    )}`;
    const entry: ZoneQrEntry = {
      storeId: selectedStoreId,
      zone,
      zoneId,
      qrId,
      qrUrl,
      qrImageUrl,
      generatedAt: new Date().toISOString(),
    };
    setZoneQrByStore((prev) => ({
      ...prev,
      [selectedStoreId]: {
        ...(prev[selectedStoreId] ?? {}),
        [zoneId]: entry,
      },
    }));
    setQrMessage(`ZONE ${zone}의 QR을 생성했습니다.`);
  };

  const copyQrUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setQrMessage("QR URL을 복사했습니다.");
    } catch {
      setQrMessage("복사에 실패했습니다. URL을 직접 선택해 복사해 주세요.");
    }
  };

  const downloadQrImage = async (entry: ZoneQrEntry) => {
    try {
      const response = await fetch(entry.qrImageUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${entry.storeId}-${entry.zoneId}-qr.png`;
      link.click();
      URL.revokeObjectURL(objectUrl);
      setQrMessage("QR 이미지 다운로드를 시작했습니다.");
    } catch {
      setQrMessage("QR 이미지 다운로드에 실패했습니다.");
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E5E5E5] pb-4">
        <div>
          <h1 className="text-lg font-semibold text-[#111111]">매장 운영</h1>
          <p className="mt-1 text-sm text-[#666666]">
            매장을 선택하고 하위 운영 탭에서 작업합니다.
          </p>
        </div>
        <div className="flex min-w-[240px] flex-col gap-1">
          <label htmlFor="operation-store" className="text-xs text-[#888888]">
            현재 매장
          </label>
          {role === "master" ? (
            <select
              id="operation-store"
              value={selectedStoreId}
              onChange={(e) => {
                const nextStoreId = e.target.value;
                window.location.href = adminHref(
                  `/admin/operations?storeId=${nextStoreId}&tab=${safeTab}`,
                  role,
                );
              }}
              className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-2 text-sm text-[#111111]"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-2 text-sm text-[#111111]">
              {selectedStore?.name ?? "본인 매장"}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-[#E5E5E5] pb-3">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={adminHref(
              `/admin/operations?storeId=${selectedStoreId}&tab=${item.id}`,
              role,
            )}
            className={`rounded-sm border px-3 py-1.5 text-xs ${
              safeTab === item.id
                ? "border-[#111111] bg-[#111111] text-white"
                : "border-[#E5E5E5] bg-white text-[#666666] hover:text-[#111111]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mt-5">
        <h2 className="text-base font-semibold text-[#111111]">{tabTitle(safeTab)}</h2>
        <p className="mt-1 text-sm text-[#666666]">
          현재 단계에서는 화면 구조와 mock 흐름만 제공합니다.
        </p>
        {safeTab === "merchandising" ? (
          <>
            <section className="mt-4 rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadTemplate("zone-merchandising-template.csv", ZONE_MERCH_COLUMNS)}
                    className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5]"
                  >
                    엑셀 양식 다운로드
                  </button>
                  <label className="cursor-pointer rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5]">
                    파일 선택
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <span className="text-xs text-[#666666]">
                    {uploadFile ? uploadFile.name : "선택된 파일 없음"}
                  </span>
                  <button
                    type="button"
                    onClick={applyZoneMerchUpload}
                    className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                  >
                    업로드 실행
                  </button>
                </div>
                <button
                  type="button"
                  onClick={openCreateEntryModal}
                  className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5]"
                >
                  수동 등록
                </button>
              </div>
              <p className="mt-3 text-xs text-[#666666]">
                업로드 컬럼: ZONE, 제품코드, 색상
              </p>
              <p className="mt-1 text-xs text-[#666666]">
                매장별 ZONE·제품코드·색상 편성 데이터는 사용자 화면에서 ZONE 선택 시 상품 마스터
                정보를 조회하는 기준으로 사용됩니다.
              </p>
            </section>

            {uploadMessage ? (
              <p className="mt-3 text-xs text-[#111111]">{uploadMessage}</p>
            ) : null}
            {uploadSummary ? (
              <div className="mt-2 rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-3 py-2 text-xs text-[#666666]">
                <p>성공 건수: {uploadSummary.successCount}</p>
                <p>실패 건수: {uploadSummary.failCount}</p>
                <p>수정 건수: {uploadSummary.updatedCount}</p>
                <p>신규 건수: {uploadSummary.createdCount}</p>
              </div>
            ) : null}
            {deletePolicyMessage ? (
              <div className="mt-2 rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-3 py-2 text-xs text-[#111111]">
                {deletePolicyMessage}
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto rounded-sm border border-[#E5E5E5]">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E5E5E5] bg-white px-3 py-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="zone-filter-select" className="text-xs text-[#666666]">
                    ZONE 필터
                  </label>
                  <select
                    id="zone-filter-select"
                    value={zoneFilter}
                    onChange={(e) => setZoneFilter(e.target.value)}
                    className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-xs text-[#111111]"
                  >
                    <option value="all">전체</option>
                    {registeredZones.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="zone-sort-select" className="text-xs text-[#666666]">
                    정렬
                  </label>
                  <select
                    id="zone-sort-select"
                    value={zoneRowSort}
                    onChange={(e) => setZoneRowSort(e.target.value as ZoneRowSortOption)}
                    className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-xs text-[#111111]"
                  >
                    <option value="zone-asc">ZONE 오름차순</option>
                    <option value="zone-desc">ZONE 내림차순</option>
                    <option value="product-asc">제품코드 오름차순</option>
                    <option value="product-desc">제품코드 내림차순</option>
                  </select>
                </div>
              </div>
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#F5F5F5]">
                    <th className="px-3 py-2 text-xs font-medium text-[#666666]">ZONE</th>
                    <th className="px-3 py-2 text-xs font-medium text-[#666666]">제품코드</th>
                    <th className="px-3 py-2 text-xs font-medium text-[#666666]">색상</th>
                    <th className="px-3 py-2 text-xs font-medium text-[#666666]">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleZoneRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-xs text-[#888888]">
                        {zoneRows.length === 0
                          ? "등록된 편성 데이터가 없습니다."
                          : "선택한 조건에 맞는 데이터가 없습니다."}
                      </td>
                    </tr>
                  ) : (
                    visibleZoneRows.map((row) => (
                      <tr
                        key={`${row.zone}-${row.productCode}-${row.colorCode}`}
                        className="border-b border-[#E5E5E5] last:border-b-0"
                      >
                        <td className="px-3 py-2 text-sm text-[#111111]">{row.zone}</td>
                        <td className="px-3 py-2 text-sm text-[#111111]">{row.productCode}</td>
                        <td className="px-3 py-2 text-sm text-[#111111]">{row.colorCode}</td>
                        <td className="px-3 py-2 text-xs">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => openEditEntryModal(row)}
                              className="text-[#111111] underline-offset-2 hover:underline"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteEntry(row)}
                              className="text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {entryModalMode ? (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 px-4">
                <section className="w-full max-w-md rounded-sm border border-[#E5E5E5] bg-white p-4">
                  <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                    <h3 className="text-sm font-semibold text-[#111111]">
                      {entryModalMode === "create" ? "편성 등록" : "편성 수정"}
                    </h3>
                    <button
                      type="button"
                      onClick={closeEntryModal}
                      className="text-xs text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
                    >
                      닫기
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-[#888888]">ZONE</label>
                      <input
                        value={zoneDraft}
                        onChange={(e) => setZoneDraft(e.target.value)}
                        className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-[#888888]">제품코드</label>
                      <input
                        value={productCodeDraft}
                        onChange={(e) => setProductCodeDraft(e.target.value)}
                        className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-[#888888]">색상</label>
                      <input
                        value={colorCodeDraft}
                        onChange={(e) => setColorCodeDraft(e.target.value)}
                        className="rounded-sm border border-[#E5E5E5] bg-white px-2 py-1.5 text-sm text-[#111111]"
                      />
                    </div>
                  </div>
                  {entryError ? <p className="mt-3 text-xs text-[#111111]">{entryError}</p> : null}
                  <div className="mt-4 flex justify-end gap-2 border-t border-[#E5E5E5] pt-4">
                    <button
                      type="button"
                      onClick={closeEntryModal}
                      className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#666666] hover:text-[#111111]"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={saveEntry}
                      className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                    >
                      {entryModalMode === "create" ? "등록" : "수정"}
                    </button>
                  </div>
                </section>
              </div>
            ) : null}
          </>
        ) : safeTab === "qr" ? (
          <>
            <section className="mt-4 rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] p-4">
              <p className="text-xs text-[#666666]">
                QR 생성 대상은 현재 매장의 ZONE 편성 데이터입니다. ZONE이 먼저 등록되어 있어야
                QR 생성이 가능합니다.
              </p>
            </section>
            {qrMessage ? (
              <p className="mt-3 text-xs text-[#111111]">{qrMessage}</p>
            ) : null}
            {registeredZones.length === 0 ? (
              <div className="mt-4 rounded-sm border border-[#E5E5E5] bg-white px-4 py-8 text-center text-sm text-[#666666]">
                현재 매장에 등록된 ZONE이 없어 QR을 생성할 수 없습니다. 먼저 `존·구역 및 상품 편성`
                탭에서 ZONE을 등록해 주세요.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-sm border border-[#E5E5E5]">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E5E5] bg-[#F5F5F5]">
                      <th className="px-3 py-2 text-xs font-medium text-[#666666]">ZONE</th>
                      <th className="px-3 py-2 text-xs font-medium text-[#666666]">QR URL</th>
                      <th className="px-3 py-2 text-xs font-medium text-[#666666]">QR 이미지</th>
                      <th className="px-3 py-2 text-xs font-medium text-[#666666]">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredZones.map((zone) => {
                      const zoneId = zoneIdFromLabel(zone);
                      const existingEntry = zoneQrByStore[selectedStoreId]?.[zoneId];
                      return (
                        <tr key={zoneId} className="border-b border-[#E5E5E5] last:border-b-0">
                          <td className="px-3 py-3 text-sm text-[#111111]">{zone}</td>
                          <td className="px-3 py-3 align-top">
                            {existingEntry ? (
                              <div className="space-y-2">
                                <code className="block rounded-sm bg-[#F5F5F5] px-2 py-1 text-xs text-[#666666]">
                                  {existingEntry.qrUrl}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => copyQrUrl(existingEntry.qrUrl)}
                                  className="rounded-sm border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs text-[#111111] hover:bg-[#F5F5F5]"
                                >
                                  복사
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-[#888888]">아직 생성되지 않았습니다.</span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top">
                            {existingEntry ? (
                              <div className="space-y-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={existingEntry.qrImageUrl}
                                  alt={`${zone} QR`}
                                  className="h-[120px] w-[120px] border border-[#E5E5E5] bg-white object-contain"
                                />
                                <button
                                  type="button"
                                  onClick={() => downloadQrImage(existingEntry)}
                                  className="rounded-sm border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs text-[#111111] hover:bg-[#F5F5F5]"
                                >
                                  다운로드
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-[#888888]">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <button
                              type="button"
                              onClick={() => createQrForZone(zone)}
                              disabled={!zone}
                              className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {existingEntry ? "생성 완료" : "QR 생성"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-sm border border-[#E5E5E5]">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#F5F5F5]">
                  <th className="px-3 py-2 text-xs font-medium text-[#666666]">구분</th>
                  <th className="px-3 py-2 text-xs font-medium text-[#666666]">값</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#E5E5E5]">
                  <td className="px-3 py-2 text-xs text-[#666666]">역할</td>
                  <td className="px-3 py-2 text-sm text-[#111111]">
                    {role === "master" ? "마스터 관리자" : "매장 관리자"}
                  </td>
                </tr>
                <tr className="border-b border-[#E5E5E5]">
                  <td className="px-3 py-2 text-xs text-[#666666]">선택 매장</td>
                  <td className="px-3 py-2 text-sm text-[#111111]">
                    {selectedStore?.name ?? selectedStoreId}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-xs text-[#666666]">현재 탭</td>
                  <td className="px-3 py-2 text-sm text-[#111111]">{tabTitle(safeTab)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
