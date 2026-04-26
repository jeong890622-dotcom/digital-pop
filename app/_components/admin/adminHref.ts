import type { AdminRole } from "../../_types/admin";

export function adminHref(path: string, role: AdminRole): string {
  const base = path.startsWith("/") ? path : `/${path}`;
  const [pathname, query = ""] = base.split("?");
  const q = new URLSearchParams(query);
  q.set("role", role);
  return `${pathname}?${q.toString()}`;
}
