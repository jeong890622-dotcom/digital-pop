/**
 * 고객 화면 등에서 사이즈 라벨 끝의 단위 표기 `(mm)` / `（mm）` 를 생략합니다.
 * 데이터·매칭용 원본은 그대로 두고 표시/견적 표기에만 사용합니다.
 */
export function stripSizeMillimeterSuffix(label: string): string {
  return label
    .replace(/\s*\(\s*[mM][mM]\s*\)\s*$/u, "")
    .replace(/\s*（\s*[mM][mM]\s*）\s*$/u, "")
    .trim();
}
