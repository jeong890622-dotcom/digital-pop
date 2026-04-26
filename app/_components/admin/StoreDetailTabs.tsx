"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { adminHref } from "./adminHref";

type StoreDetailTabsProps = {
  storeId: string;
};

export function StoreDetailTabs({ storeId }: StoreDetailTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") === "store" ? "store" : "master";
  const allTabs = [
    { href: `/admin/stores/${storeId}`, label: "기본 정보" },
    { href: `/admin/stores/${storeId}/merchandising`, label: "존·구역 및 상품 편성" },
    { href: `/admin/stores/${storeId}/qr`, label: "QR 관리" },
    { href: `/admin/stores/${storeId}/managers`, label: "매장 관리자 계정" },
  ];
  const tabs =
    role === "master"
      ? allTabs
      : allTabs.filter(
          (tab) =>
            tab.href === `/admin/stores/${storeId}` ||
            tab.href === `/admin/stores/${storeId}/merchandising`,
        );

  return (
    <nav className="mt-4 flex flex-wrap gap-2 border-b border-[#E5E5E5] pb-3">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={adminHref(tab.href, role)}
            className={`rounded-sm border px-3 py-1.5 text-xs ${
              active
                ? "border-[#111111] bg-[#111111] text-white"
                : "border-[#E5E5E5] bg-white text-[#666666] hover:text-[#111111]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
