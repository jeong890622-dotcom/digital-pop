import { customerCatalogRoot, customerContentPadding } from "./deskerTokens";

/**
 * 고객 화면 레이아웃 (DESKER v2)
 * - 셸: min(100% - 1.5rem, 1440px) 중앙
 * - PRODUCT DETAILS·CART: 전체 화면 오버레이 우선 (가이드 top-10 예외)
 */

export const customerPageOuterClass = "min-h-screen bg-white";

export const customerShellClass =
  `mx-auto min-h-screen w-full max-w-[min(100%-1.5rem,1440px)] bg-white ${customerCatalogRoot}`;

export const customerOverlayShellClass =
  `w-full max-w-[min(100%-1.5rem,1440px)] ${customerCatalogRoot}`;

export const customerCartPanelClass =
  "pointer-events-auto relative z-[61] flex h-full max-h-[100dvh] w-full flex-col overflow-hidden bg-[#E8E5DC] " +
  "md:max-h-[min(92vh,900px)] md:max-w-[min(100%-1.5rem,1440px)]";

export const customerCartBackdropClass = "absolute inset-0 bg-black/30";

export const customerCartPanelPositionClass =
  "pointer-events-none absolute inset-0 flex justify-center md:py-8 lg:py-10";

/** 견적서 보기 바와 동일 좌우 inset (셸 max-width + content padding) */
export const customerDetailSheetPositionClass =
  "pointer-events-none absolute inset-0 flex justify-center";

export const customerDetailSheetOuterClass =
  `mx-auto flex h-full w-full max-w-[min(100%-1.5rem,1440px)] ${customerContentPadding}`;

export const customerDetailSheetClass =
  "pointer-events-auto relative z-[61] flex h-full max-h-[100dvh] w-full flex-col overflow-hidden bg-white " +
  "md:max-h-[min(92vh,calc(100dvh-2.5rem))]";

export const customerDetailBackdropClass = "absolute inset-0 bg-black/30";

/** 헤더·알림 스택 아래 고정 영역 */
export const customerStickyBelowHeaderClass = "sticky top-10 z-[9]";
