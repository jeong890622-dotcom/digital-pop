/** DESKER Design Guide v2 (2026-05-19) — 고객 화면 디자인 토큰 */

export const DESKER_BLACK = "#282828";
export const DESKER_DARK_GRAY = "#515151";
export const DESKER_MUTED = "#7E7E7E";
export const DESKER_LIGHT_GRAY = "#B3B3B3";
export const DESKER_ORANGE = "#FF5948";
export const DESKER_IMAGE_BG = "#F0F0F0";
export const DESKER_BEIGE_LIGHT = "#E4E0D6";
export const DESKER_CART_NOTICE_TEXT = "#B1A78A";
export const DESKER_EXPIRY_BG = "#FFDEDA";
export const DESKER_CART_PANEL_BG = "#E8E5DC";

export const customerContentPadding = "px-4 sm:px-6 lg:px-10";

/** Figtree — 영문 라벨·버튼 캡스 (`globals.css` --font-english) */
export const customerFontEnglish = "font-english";

/** 행간 140% (가이드 전역) */
export const customerLeading = "leading-[1.4]";

/** 본문·카드 제품명 공통 크기 */
export const customerBodySize = "text-[14px] sm:text-[18px]";

/** 고객 화면 루트 — 본문 14px / sm+ 18px, 자간 3% */
export const customerCatalogRoot = [
  customerBodySize,
  customerLeading,
  "tracking-[0.03em]",
  "text-[#282828]",
].join(" ");

/** 본문 */
export const customerBodyText = ["text-[#282828]", customerLeading].join(" ");

export const customerBodyMedium = [
  customerBodySize,
  "font-medium text-[#282828]",
  customerLeading,
  "tracking-[0.03em]",
].join(" ");

/** 주 버튼(#282828) 위 텍스트 — 견적서 보기 등 */
export const customerOnPrimaryText = [
  customerBodySize,
  "font-medium",
  customerLeading,
  "tracking-[0.03em]",
  "text-[#FFFFFF]",
].join(" ");

/** 패널 버튼·옵션 칩 공통 높이 */
export const customerPanelButtonHeight = "h-10 min-h-10 shrink-0";

/** 패널 버튼·옵션 칩 내부 본문 */
export const customerPanelButtonText = [
  customerBodySize,
  customerLeading,
  "tracking-[0.03em]",
  "text-[#282828]",
].join(" ");

/** 패널 버튼(#282828 배경) 내부 텍스트 */
export const customerPanelButtonTextOnDark = [
  customerBodySize,
  "font-medium",
  customerLeading,
  "tracking-[0.03em]",
  "text-[#FFFFFF]",
].join(" ");

/** 패널 액션 버튼 캡스 (CART, OK) — 칩과 동일 본문 크기 */
export const customerPanelActionCaps = [
  customerFontEnglish,
  customerBodySize,
  "font-medium",
  "uppercase",
  "tracking-[0.13em]",
  customerLeading,
  "text-[#282828]",
].join(" ");

export const customerPanelActionCapsOnDark = [
  customerFontEnglish,
  customerBodySize,
  "font-medium",
  "uppercase",
  "tracking-[0.13em]",
  customerLeading,
  "text-[#FFFFFF]",
].join(" ");

/** SIZE / COLOUR / OPTION / TOTAL 라벨 (본문과 동일 크기) */
export const customerPanelSectionLabel = [
  customerFontEnglish,
  customerBodySize,
  customerLeading,
  "tracking-[0.03em]",
  "uppercase",
  "text-[#282828]",
].join(" ");

/** PRODUCT DETAIL ↗ 링크 */
export const customerProductDetailLink = [
  customerPanelButtonText,
  "text-[#B3B3B3]",
  "transition-colors",
  "hover:text-[#282828]",
  "hover:underline",
].join(" ");

/** SIZE / COLOUR / OPTION 섹션 간격 */
export const customerPanelOptionSectionGap = "space-y-5";

/** 옵션 칩 미선택 hover — 흰 박스 → 검정 박스 + 흰 텍스트 */
export const customerOptionChipHover =
  "hover:border-[#282828] hover:bg-[#282828] hover:text-[#FFFFFF]";

export const customerMutedText = ["text-[#7E7E7E]", customerLeading].join(" ");

export const customerDarkGrayText = ["text-[#515151]", customerLeading].join(" ");

export const customerLightText = ["text-[#B3B3B3]", customerLeading].join(" ");

export const customerPlaceholder = "placeholder:text-[#B3B3B3]";

export const customerAttentionText = ["text-[#FF5948]", customerLeading].join(" ");

/** 보조·배지 (카드·CART 리스트) */
export const customerBadgeText = [
  "text-[12px]",
  customerLeading,
  "tracking-[0.03em]",
  "sm:text-[14px]",
].join(" ");

/** 메인 헤더 1행 · RESULTS · ZONE — 카드 제품명과 동일 크기 */
export const customerMainNavLabel = [
  customerFontEnglish,
  customerBodySize,
  "font-medium",
  "uppercase",
  "tracking-[0.13em]",
  customerLeading,
  "text-[#282828]",
].join(" ");

/** RESULTS — 메인 네비와 동일 */
export const customerResultsLabel = customerMainNavLabel;

/** 패널·옵션 영문 라벨 (SIZE, CLOSE, PRODUCT DETAILS 등) */
export const customerCapsLabel = [
  customerFontEnglish,
  "text-[11px]",
  "font-medium",
  "uppercase",
  "tracking-[0.13em]",
  customerLeading,
  "text-[#282828]",
].join(" ");

/** 상세 시트 제품명 */
export const customerDetailTitle = [
  "text-[20px]",
  "font-normal",
  customerLeading,
  "tracking-[0.03em]",
  "text-[#282828]",
  "sm:text-[28px]",
].join(" ");

export const customerPanelDivider = "border-t border-[#282828]";

export const customerListDivider = "border-b border-[#282828]/15";

/** 텍스트 링크·트리거 hover */
export const customerTextHover = "transition-colors hover:text-[#FF5948]";

export const customerTextHoverUnderline = [
  customerTextHover,
  "hover:underline",
].join(" ");

/** 카드 제품명 — 클릭/호버 시 #282828 언더라인만 (색 변경 없음) */
export const customerCardTitleHover = [
  "group-hover:underline",
  "group-active:underline",
  "group-focus-visible:underline",
  "decoration-[#282828]",
  "underline-offset-[14%]",
].join(" ");

/** 주 버튼 (견적서 보기, CART 담기) — 기본 #282828 / hover #515151, 흰 텍스트 */
export const customerPrimaryButton = [
  "flex",
  customerPanelButtonHeight,
  "items-center",
  "border border-[#282828]",
  "bg-[#282828]",
  "transition-colors",
  "hover:border-[#282828]",
  "hover:bg-[#515151]",
].join(" ");

/** 아웃라인 버튼 (OK) */
export const customerOutlineButton = [
  "flex",
  customerPanelButtonHeight,
  "items-center",
  "border border-[#282828] bg-white",
  "transition-colors",
  "hover:bg-[#282828] hover:text-[#FFFFFF]",
].join(" ");

/** 옵션 칩 좌우 패딩 — 모든 화면 px-5 (좌우 각 20px) */
export const customerOptionChipPadding = "px-5";

/** 상세 옵션 칩 (미선택) */
export const customerOptionChip =
  "border border-[#282828] bg-white";

/** 상세 옵션 칩 (선택) */
export const customerOptionChipSelected =
  "border border-[#282828] bg-[#282828] text-white";

/** 상세 옵션 칩 (비활성) */
export const customerOptionChipDisabled =
  "cursor-not-allowed border-[#B3B3B3] text-[#B3B3B3]";
