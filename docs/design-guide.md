# DESKER Design Guide

**최종 업데이트: 2026-05-19 (v2)**

> **구현 예외 (로컬 코드)**  
> PRODUCT DETAILS·CART: 전체 화면 딤 `bg-black/30` + `z-[60]`/`z-[61]`. 가이드의 패널 `top-10` / `top-[200px]` 미적용.

코드 토큰: `app/_lib/deskerTokens.ts` · 레이아웃: `app/_lib/customerLayout.ts`

---

## Brand Tone

- 미니멀·정돈·여백 중심
- 제품 이미지 우선, 과한 카드/그림자/그라데이션 금지

## Colors

| 이름 | HEX | 용도 |
|---|---|---|
| Desker Black | `#282828` | 주 텍스트·보더·주 버튼 |
| Desker Dark Gray | `#515151` | 주 버튼 hover, 미전시 문구 |
| Gray 50 | `#7E7E7E` | Muted (RESULTS, 빈 목록) |
| Desker Light Gray | `#B3B3B3` | disabled, 지우기, 소비자가 취소선 |
| Gray 10 | `#F0F0F0` | 이미지 배경 |
| White | `#FFFFFF` | 기본 배경 |
| Attention Orange | `#FF5948` | 텍스트 hover, 삭제, 만료 알림 |
| Desker Beige Light | `#E4E0D6` | 24시간 안내 바 |
| Cart notice text | `#B1A78A` | 24시간 안내 문구 |
| Expiry Notice Bg | `#FFDEDA` | 견적 만료 알림 |
| Cart Panel Bg | `#E8E5DC` | CART 패널 |

## Typography

| 구분 | 스펙 | Tailwind 토큰 |
|---|---|---|
| 한글 | Pretendard (CDN) | `font-sans` (body) |
| 영문 | Figtree (Google Fonts) | `font-english` / `customerCapsLabel` |
| 행간 | 140% | `leading-[1.4]` |
| 본문 자간 | 3% | `tracking-[0.03em]` |
| 타이틀·캡스 자간 | 13%, uppercase | `tracking-[0.13em]` |
| 본문 | 14px → `sm`(640px)+ 18px | `customerCatalogRoot` |
| 배지 | 12px → `sm` 14px | `customerBadgeText` |
| 영문 라벨 | 11px, medium, caps | `customerCapsLabel` |
| 상세 제품명 | 20px → `sm` 28px | `customerDetailTitle` |

## Interaction

| 대상 | 동작 |
|---|---|
| 텍스트 링크·ZONE·지우기·REMOVE | `hover:text-[#FF5948]` (+ underline 가능) |
| 주 버튼 | `bg-[#282828]` → hover `#515151` |
| 아웃라인 버튼 (OK) | 흰 배경 → hover 채움 `#282828` |
| 카드 제품명 | hover `#FF5948` + underline |

## Layout (고객 메인)

- 셸: `min(100% - 1.5rem, 1440px)` 중앙
- 패딩: `px-4 sm:px-6 lg:px-10`
- 그리드: 2열 / `sm` 3열 / `lg` 4열

## Main Header (메인 메뉴)

- 1행 `h-10`: `DIGITAL POP` · `DESKER {storeCode}` (`sm+`) · `CART {n}` · `KST` (`lg+`)
- **1행 4요소 동일**: `customerMainNavLabel` — 카드 제품명과 동일 **14px / sm+ 18px**, Figtree, medium, caps
- 2행: 검색 + `ZONE ALL ↓` (`h-10`, 하단 보더 `#282828`)
- 구분선 → `{n} RESULTS` (메인 네비와 **동일** 라벨 스타일, Desker Black)

## Search + ZONE

- placeholder·지우기: Light Gray, 지우기 hover orange
- ZONE 트리거: `customerMainNavLabel`, hover underline only

## Location / Notice bars

- 위치 바: `bg-[#B3B3B3]`, `h-10`, zone명 uppercase medium
- 24h 안내: `bg-[#E4E0D6]`, 문구 `#B1A78A`, 본문 크기
- 만료 알림: `bg-[#FFDEDA]`, 문구·OK `#FF5948`

## Product Card

- 이미지 `aspect-[4/3]`, `bg-[#F0F0F0]`
- 제품명 medium, 사이즈·가격 `mt-1`, 배지 `mt-2`
- 제품명 클릭/호버: **#282828 언더라인만** (색 변경 없음)
- 스펙(치수): Muted `#7E7E7E` · 가격: Desker Black medium

## 하단 견적 바

- `h-10`, `#282828`, hover `#515151`
- 좌 `견적서 보기` · 우 `{n}개 · {금액}` (본문 medium, 흰색)

## PRODUCT DETAILS 패널

- 헤더 `PRODUCT DETAILS` / `CLOSE` (캡스 11px)
- 제품명 `customerDetailTitle`, 가격 medium, 소비자가 취소선 Light Gray
- SIZE → COLOUR → OPTION (`customerCapsLabel` + `h-10` 칩)
- `PRODUCT DETAIL ↗`: Light Gray, hover orange
- TOTAL + 수량 stepper + `CART` 주 버튼 (캡스)

## CART (견적서) 패널

- 배경 `#E8E5DC`, 헤더 `CART`
- 항목: 그룹명 medium, 코드/Size/Colour 본문, 가격 medium, `REMOVE` 캡스 hover orange
- `REMOVE ALL` · 하단 `OK`(아웃라인) + `TOTAL` 바

## 배지 (카드·CART)

- NEW `#FFDC1E` · BEST `#336DFF` · PROMOTION `#F72B35` · 벽고정 `#FF5948` · 전시품 `#B3B3B3`
- 순서: (1) NEW/BEST/PROMOTION 하나 (2) 벽 고정 (3) 전시품 판매

## Underline (전역)

`globals.css`: thickness 5.5%, offset 14%, skip-ink auto
