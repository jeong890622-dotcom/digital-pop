/**
 * 고객 화면 상단 매장명 — 관리자 매장목록 stores.name 그대로 사용.
 * 예: "DESKER 노원점" → 브랜드 DESKER + 지점명 노원점
 */
export type CustomerStoreTitleParts = {
  brand: string;
  branch: string;
};

export function parseCustomerStoreTitle(storeName: string): CustomerStoreTitleParts {
  const trimmed = storeName.trim();
  if (!trimmed) {
    return { brand: "", branch: "" };
  }

  const deskerMatch = trimmed.match(/^(DESKER|데스커)\s+(.+)$/i);
  if (deskerMatch?.[2]) {
    return {
      brand: "DESKER",
      branch: deskerMatch[2].trim(),
    };
  }

  return { brand: trimmed, branch: "" };
}

/** 한 줄 표기가 필요할 때(에러 화면 등) */
export function formatCustomerStoreTitle(storeName: string): string {
  const { brand, branch } = parseCustomerStoreTitle(storeName);
  if (!brand) return "";
  return branch ? `${brand} ${branch}` : brand;
}

/** 고객 헤더 중앙 — stores.name 기준 (예: DESKER 노원점). 관리자 매장명 수정 시 반영 */
export function customerHeaderStoreLabel(storeName: string): string {
  const trimmed = storeName.trim();
  if (!trimmed) return "";

  const { branch } = parseCustomerStoreTitle(trimmed);
  if (branch) return `DESKER ${branch}`;

  if (/^(DESKER|데스커)\s*$/i.test(trimmed)) return "DESKER";

  return `DESKER ${trimmed}`;
}
