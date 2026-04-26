import type { AdminRole } from "../_types/admin";

export type AdminNavItem = {
  href: string;
  label: string;
};

export type MockStore = {
  id: string;
  code: string;
  name: string;
};

export const MOCK_STORES: MockStore[] = [
  { id: "store-seoul-gangnam", code: "GNM", name: "DESKER 강남점" },
  { id: "store-seoul-pangyo", code: "PGY", name: "DESKER 판교점" },
  { id: "store-busan-centum", code: "CTM", name: "DESKER 부산 센텀점" },
];

export const MOCK_STORE_ADMIN_STORE_ID = "store-seoul-gangnam";

export function navItemsForRole(role: AdminRole): AdminNavItem[] {
  if (role === "master") {
    return [
      { href: "/admin/products", label: "상품 마스터" },
      { href: "/admin/product-events", label: "상품 이벤트 등록" },
      { href: "/admin/stores", label: "매장 목록" },
      { href: "/admin/operations", label: "매장 운영" },
      { href: "/admin/account-create/master", label: "마스터 관리자 계정 관리" },
      { href: "/admin/account-create/store", label: "매장 관리자 계정 관리" },
    ];
  }

  return [{ href: "/admin/operations", label: "매장 운영" }];
}

export function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isPathAllowedForStore(pathname: string): boolean {
  const path = normalizePath(pathname);
  return (
    path === "/admin/operations" ||
    path.startsWith("/admin/operations/") ||
    path === "/admin/my-account"
  );
}
