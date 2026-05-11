"use client";

import { useMemo, useState } from "react";

type CollectedRow = {
  category: string;
  productName: string;
  productCode: string;
  colorCode: string;
  imageUrl: string;
  consumerPrice: number;
  detailUrl: string;
};

type CollectResponse = {
  categoryUrl: string;
  categorySeedCount?: number;
  categoryPageCount?: number;
  detailPageCount?: number;
  successCount: number;
  failCount: number;
  rows: CollectedRow[];
  failures: Array<{ detailUrl: string; reason: string }>;
};

const DEFAULT_MOTION_DESK_URL =
  "https://www.desker.co.kr/products/category?searchType=dtl&sort=best&subCateNo=15";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadRowsAsCsv(rows: CollectedRow[]): void {
  const columns = ["카테고리", "제품명", "제품코드", "색상코드", "이미지URL", "소비자가", "상세URL"];
  const lines = rows.map((row) =>
    [
      row.category ?? "",
      row.productName,
      row.productCode,
      row.colorCode,
      row.imageUrl,
      String(row.consumerPrice),
      row.detailUrl,
    ]
      .map((value) => csvEscape(value))
      .join(","),
  );
  const bom = "\uFEFF";
  const content = `${bom}${columns.join(",")}\n${lines.join("\n")}\n`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "desker-product-collection.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function ProductCollectionPage() {
  const [categoryUrl, setCategoryUrl] = useState(DEFAULT_MOTION_DESK_URL);
  const [maxProducts, setMaxProducts] = useState(120);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CollectResponse | null>(null);

  const groupedByCode = useMemo(() => {
    if (!result) return [];
    const map = new Map<string, CollectedRow[]>();
    for (const row of result.rows) {
      const list = map.get(row.productCode) ?? [];
      list.push(row);
      map.set(row.productCode, list);
    }
    for (const [, list] of map.entries()) {
      list.sort((r1, r2) => r1.colorCode.localeCompare(r2.colorCode));
    }
    return [...map.entries()].sort((a, b) => {
      const rowA = a[1][0];
      const rowB = b[1][0];
      const byCat = (rowA?.category ?? "").localeCompare(rowB?.category ?? "");
      if (byCat !== 0) return byCat;
      const byName = (rowA?.productName ?? "").localeCompare(rowB?.productName ?? "");
      if (byName !== 0) return byName;
      return a[0].localeCompare(b[0]);
    });
  }, [result]);

  const runCollect = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/product-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryUrl, maxProducts }),
      });
      const data = (await response.json()) as CollectResponse | { message?: string };
      if (!response.ok) {
        setResult(null);
        const msg =
          typeof data === "object" && data !== null && "message" in data && typeof (data as { message?: unknown }).message === "string"
            ? (data as { message: string }).message
            : "상품 수집에 실패했습니다.";
        setErrorMessage(msg);
        return;
      }
      setResult(data as CollectResponse);
    } catch {
      setResult(null);
      setErrorMessage("수집 요청 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section>
      <h1 className="text-lg font-semibold text-[#111111]">상품 수집</h1>
      <p className="mt-1 text-sm text-[#666666]">
        데스커 공식몰 카테고리·제품군 URL로 제품코드/색상코드 등을 수집하고 CSV로 내립니다.
      </p>
      <div className="mt-3 space-y-2 text-xs text-[#666666]">
        <p>
          수집은 데스커 공식몰 카테고리(URL) 또는 제품군(URL) 입력 시 수집됩니다. 제품군 목록이 여러 페이지로 나뉘어 있으면{" "}
          <span className="font-mono text-[11px]">page=1</span>, <span className="font-mono text-[11px]">page=2</span>{" "}
          형태의 다음 페이지도 같은 조건으로 자동 순회합니다.
        </p>
        <div className="space-y-2 rounded-sm border border-[#E5E5E5] bg-white p-3 text-[#111111]">
          <p className="text-xs font-medium text-[#111111]">예시</p>
          <div>
            <p className="text-xs text-[#666666]">DESK 카테고리 전체 수집 시 입력 URL</p>
            <p className="mt-0.5 break-all font-mono text-xs leading-relaxed text-[#111111]">
              https://www.desker.co.kr/products?cateNo=3
            </p>
          </div>
          <div>
            <p className="text-xs text-[#666666]">컴퓨터데스크 제품군 전체 수집 시 입력 URL</p>
            <p className="mt-0.5 break-all font-mono text-xs leading-relaxed text-[#111111]">
              https://www.desker.co.kr/products/category?searchType=dtl&sort=best&subCateNo=10
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_120px_auto]">
          <div className="flex flex-col gap-1">
            <label htmlFor="collect-url" className="text-xs text-[#888888]">
              수집 대상 카테고리 URL
            </label>
            <input
              id="collect-url"
              value={categoryUrl}
              onChange={(e) => setCategoryUrl(e.target.value)}
              placeholder="https://www.desker.co.kr/products/category?..."
              className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="collect-max" className="text-xs text-[#888888]">
              최대 수집 건수
            </label>
            <input
              id="collect-max"
              type="number"
              min={1}
              max={300}
              value={maxProducts}
              onChange={(e) => setMaxProducts(Math.max(1, Math.min(300, Number(e.target.value) || 1)))}
              className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111]"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={runCollect}
              disabled={isLoading}
              className="rounded-sm bg-[#111111] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "수집 중..." : "수집 실행"}
            </button>
            <button
              type="button"
              onClick={() => (result ? downloadRowsAsCsv(result.rows) : null)}
              disabled={!result || result.rows.length === 0}
              className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              엑셀 다운로드
            </button>
          </div>
        </div>
      </div>

      {errorMessage ? <p className="mt-3 text-xs text-[#111111]">{errorMessage}</p> : null}

      {result ? (
        <>
          <div className="mt-4 rounded-sm border border-[#E5E5E5] bg-white px-3 py-2 text-xs text-[#666666]">
            <p>수집 시드 카테고리: {result.categorySeedCount ?? 0}</p>
            <p>순회 카테고리 페이지: {result.categoryPageCount ?? 0}</p>
            <p>순회 상세 페이지: {result.detailPageCount ?? 0}</p>
            <p>수집 성공 행: {result.successCount}</p>
            <p>파싱 실패 상세: {result.failCount}</p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-sm border border-[#E5E5E5]">
            <table className="w-full min-w-[1060px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#F5F5F5]">
                  {["카테고리", "제품명", "제품코드", "색상코드", "이미지URL", "소비자가", "상세URL"].map((column) => (
                    <th key={column} className="px-2 py-2 text-[11px] font-medium text-[#666666]">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedByCode.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-sm text-[#888888]">
                      추출된 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  groupedByCode.map(([code, rows]) =>
                    rows.map((row, index) => (
                      <tr key={`${row.productCode}-${row.colorCode}`} className="border-b border-[#E5E5E5] last:border-b-0">
                        <td className="max-w-[140px] px-2 py-2 text-xs text-[#666666]" title={row.category ?? ""}>
                          {row.category?.trim() ? row.category : "-"}
                        </td>
                        <td className="px-2 py-2 text-xs text-[#111111]">{row.productName}</td>
                        <td className="px-2 py-2 text-xs font-mono text-[#111111]">
                          {index === 0 ? code : row.productCode}
                        </td>
                        <td className="px-2 py-2 text-xs font-mono text-[#666666]">{row.colorCode}</td>
                        <td className="max-w-[220px] px-2 py-2 text-xs text-[#666666]">
                          <span className="block truncate" title={row.imageUrl}>
                            {row.imageUrl || "미검출"}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-xs text-[#111111]">
                          {row.consumerPrice.toLocaleString("ko-KR")}원
                        </td>
                        <td className="max-w-[220px] px-2 py-2 text-xs text-[#666666]">
                          <span className="block truncate" title={row.detailUrl}>
                            {row.detailUrl}
                          </span>
                        </td>
                      </tr>
                    )),
                  )
                )}
              </tbody>
            </table>
          </div>

          {result.failures.length > 0 ? (
            <details className="mt-4 rounded-sm border border-[#E5E5E5] bg-white p-3 text-xs text-[#666666]">
              <summary className="cursor-pointer text-[#111111]">실패 내역 확인</summary>
              <ul className="mt-2 space-y-1">
                {result.failures.slice(0, 50).map((item) => (
                  <li key={`${item.detailUrl}-${item.reason}`}>
                    {item.detailUrl} - {item.reason}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
