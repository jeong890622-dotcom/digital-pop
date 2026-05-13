/**
 * 사용자 화면 동일 zone 내 기본 노출 순서 (상품 마스터 카테고리 기준).
 * 목록에 없는 값은 맨 뒤로 묶고, 동일 순위는 제품코드 등으로 보조 정렬한다.
 */
export const DISPLAY_CATEGORY_ORDER = [
  "데스크",
  "소파",
  "테이블",
  "책장",
  "서랍",
  "파티션",
  "스크린",
  "의자",
] as const;

const RANK = new Map<string, number>(
  DISPLAY_CATEGORY_ORDER.map((label, index) => [label, index]),
);

/** 0 이상: 고정 목록 순서. 목록에 없으면 DISPLAY_CATEGORY_ORDER.length (기타). */
export function displayCategoryRank(label: string): number {
  const t = label.trim();
  return RANK.get(t) ?? DISPLAY_CATEGORY_ORDER.length;
}
