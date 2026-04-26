import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminAppShell } from "../_components/admin/AdminAppShell";
import { AdminLayoutSkeleton } from "../_components/admin/AdminLayoutSkeleton";

export const metadata: Metadata = {
  title: "관리자 | 디지털 가격 POP",
  description: "DESKER 스타일 관리자 콘솔",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<AdminLayoutSkeleton />}>
      <AdminAppShell>{children}</AdminAppShell>
    </Suspense>
  );
}
