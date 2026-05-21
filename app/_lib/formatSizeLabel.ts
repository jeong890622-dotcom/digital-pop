/**
 * 고객 화면 표시용 — 사이즈 문자열에서 `(mm)` / `（mm）` 제거.
 * 데이터·매칭용 원본은 그대로 두고 표시에만 사용합니다.
 */
export function stripSizeMillimeterSuffix(label: string): string {
  return label
    .replace(/\(\s*[mM][mM]\s*\)/gu, "")
    .replace(/（\s*[mM][mM]\s*）/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
