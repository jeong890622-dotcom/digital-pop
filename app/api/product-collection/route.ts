import { NextResponse } from "next/server";

type CollectRequest = {
  categoryUrl?: string;
  maxProducts?: number;
};

type CollectedRow = {
  /** 목록 페이지 기준 하위 카테고리명 (예: 컴퓨터데스크, 베이직데스크) */
  category: string;
  productName: string;
  productCode: string;
  colorCode: string;
  imageUrl: string;
  consumerPrice: number;
  detailUrl: string;
};

type FailedRow = {
  detailUrl: string;
  reason: string;
};

const DESKER_HOST = "www.desker.co.kr";
const COLLECTOR_USER_AGENT = "digital-pop-product-collector/1.0";
const CATE_NO_SUBCATEGORY_OVERRIDES: Record<string, string[]> = {
  "3": ["15", "10", "9", "416", "11", "12", "16", "220", "14", "18"],
  "4": ["19", "22", "484", "424", "20", "23", "21", "414", "24"],
  "5": ["365", "25", "26", "27", "28", "29", "30", "31"],
  "6": ["321", "33", "34", "453", "35"],
  "7": ["36", "37", "38", "39", "40"],
  "8": ["41", "42"],
  "405": ["406", "526", "597"],
};
const PRODUCT_COLOR_IMAGE_OVERRIDES: Record<string, Array<{ colorCode: string; imageUrl: string }>> = {
  DSDBB1207: [
    {
      colorCode: "WWWW",
      imageUrl: "https://www.desker.co.kr/upload/product/14fd5045-0b45-4d7e-94e2-35ee42ddb8f9.png",
    },
    {
      colorCode: "MLWW",
      imageUrl: "https://www.desker.co.kr/upload/product/a0b0f7fa-795f-4b6f-8e23-cc32092cc3ac.png",
    },
    {
      colorCode: "MLFK",
      imageUrl: "https://www.desker.co.kr/upload/product/daa6254a-9eb2-415b-be2a-b877a580a1f8.png",
    },
    {
      colorCode: "MACFK",
      imageUrl: "https://www.desker.co.kr/upload/product/258797de-5b70-48e9-a698-1663338efc3c.png",
    },
    {
      colorCode: "FKFK",
      imageUrl: "https://www.desker.co.kr/upload/product/50d9fdfe-f960-4eb3-90c9-a3a17dd9f5bb.png",
    },
  ],
  DSSDAY1809: [
    {
      colorCode: "5Y1",
      imageUrl: "https://www.desker.co.kr/upload/product/4286ad1d-54fe-40cd-b4e9-e732f47d4213.png",
    },
  ],
  DSDCM1206: [
    {
      colorCode: "OSWW",
      imageUrl: "https://www.desker.co.kr/upload/product/0ee94dd5-2484-48cd-84b0-d83fb67bd8d8.png",
    },
    {
      colorCode: "WWWW",
      imageUrl: "https://www.desker.co.kr/upload/product/4ca262b8-c61c-4093-9311-9e98c345fef1.png",
    },
  ],
  DSDCM1207: [
    {
      colorCode: "FKBK",
      imageUrl: "https://www.desker.co.kr/upload/product/c02b61a1-ef13-4188-af57-4fef42a3b0ea.png",
    },
    {
      colorCode: "MACBK",
      imageUrl: "https://www.desker.co.kr/upload/product/331d2fc0-d299-4868-ac4f-5a48921fb991.png",
    },
    {
      colorCode: "MLWW",
      imageUrl: "https://www.desker.co.kr/upload/product/8f8e3d0f-bdce-4550-935c-aa95ee0a24a5.png",
    },
    {
      colorCode: "WWWW",
      imageUrl: "https://www.desker.co.kr/upload/product/8ff02360-2308-44d5-8bd0-e71f96f07210.png",
    },
  ],
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function isGenericBrandCategoryLabel(label: string): boolean {
  const t = label.trim();
  if (!t) return true;
  if (/^데스커$/i.test(t)) return true;
  if (/^desker$/i.test(t)) return true;
  return false;
}

/**
 * 목록 페이지 앵커의 subCateNm (예: subCateNo=597 → "S03").
 */
function extractSubCateNmFromAnchors(html: string, subCateNo: string): string {
  const matches = html.matchAll(/<a\s([^>]*)>/gi);
  for (const match of matches) {
    const attrs = match[1] ?? "";
    const hrefMatch = attrs.match(/\bhref=["']([^"']+)["']/i);
    const nmMatch = attrs.match(/\bsubCateNm=["']([^"']+)["']/i);
    if (!hrefMatch?.[1] || !nmMatch?.[1]) continue;
    const href = hrefMatch[1].replace(/&amp;/g, "&");
    let hrefUrl: URL;
    try {
      hrefUrl = new URL(href, `https://${DESKER_HOST}`);
    } catch {
      continue;
    }
    if (hrefUrl.searchParams.get("subCateNo") !== subCateNo) continue;
    const label = decodeHtmlEntities(nmMatch[1].trim());
    if (label) return label;
  }
  return "";
}

/** 활성 소분류 탭 텍스트 (예: class에 srtLblTxt · on 포함) */
function extractActiveSubcategoryTabLabel(html: string): string {
  const m = html.match(/class=["'][^"']*\bsrtLblTxt\b[^"']*\bon\b[^"']*["'][^>]*>([^<]+)<\/a>/i);
  if (m?.[1]) {
    const label = decodeHtmlEntities(m[1].trim());
    if (label && !/^\d{1,2}$/.test(label)) {
      return label;
    }
  }
  return "";
}

/**
 * 카테고리 목록(/products/category) HTML에서 표시용 카테고리명 추출.
 * 예: <title>컴퓨터데스크 | 데스크 | 데스커...</title> → "컴퓨터데스크"
 * subCateNo가 있는 URL은 데스커 사이트의 subCateNm·탭 라벨을 우선 (예: S03).
 */
function extractCategoryLabelFromListPage(html: string, pageUrl?: URL | null): string {
  const subCateNo = pageUrl?.searchParams.get("subCateNo")?.trim();
  if (subCateNo) {
    const fromNm = extractSubCateNmFromAnchors(html, subCateNo);
    if (fromNm) {
      return fromNm;
    }
    const fromTab = extractActiveSubcategoryTabLabel(html);
    if (fromTab) {
      return fromTab;
    }
  }

  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    const first = decodeHtmlEntities(titleMatch[1].trim())
      .split("|")[0]!
      .trim();
    if (first && !isGenericBrandCategoryLabel(first)) {
      return first;
    }
  }

  const ogOrdered = html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i);
  const ogReversed = html.match(/content=["']([^"']+)["']\s+property=["']og:title["']/i);
  const ogValue = ogOrdered?.[1] ?? ogReversed?.[1];
  if (ogValue) {
    const first = decodeHtmlEntities(ogValue.trim())
      .split("|")[0]!
      .trim();
    if (first && !isGenericBrandCategoryLabel(first)) {
      return first;
    }
  }

  const h1Match = html.match(/<h1[^>]*>\s*([^<]+?)\s*<\/h1>/i);
  if (h1Match?.[1]) {
    const inner = decodeHtmlEntities(h1Match[1].trim());
    if (inner && !isGenericBrandCategoryLabel(inner)) {
      return inner;
    }
  }

  return "";
}

function extractDetailUrls(html: string): string[] {
  const set = new Set<string>();
  const matches = html.matchAll(/\/product\/detail\/(\d+)/g);
  for (const match of matches) {
    const path = match[0];
    set.add(`https://${DESKER_HOST}${path}`);
  }
  return [...set];
}

function extractPaginationUrls(baseUrl: URL, html: string): string[] {
  const set = new Set<string>();
  set.add(baseUrl.toString());

  const matches = html.matchAll(/href=["']([^"']*\/products\/category\?[^"']+)["']/gi);
  for (const match of matches) {
    const rawHref = (match[1] ?? "").replace(/&amp;/g, "&").trim();
    if (!rawHref) continue;
    let nextUrl: URL;
    try {
      nextUrl = new URL(rawHref, baseUrl);
    } catch {
      continue;
    }
    if (nextUrl.host !== DESKER_HOST) continue;
    if (nextUrl.pathname !== baseUrl.pathname) continue;

    // 동일 분류(cateNo/subCateNo)를 유지하는 페이지네이션 링크만 포함
    const baseCateNo = baseUrl.searchParams.get("cateNo");
    const baseSubCateNo = baseUrl.searchParams.get("subCateNo");
    const nextCateNo = nextUrl.searchParams.get("cateNo");
    const nextSubCateNo = nextUrl.searchParams.get("subCateNo");
    if ((baseCateNo || "") !== (nextCateNo || "")) continue;
    if ((baseSubCateNo || "") !== (nextSubCateNo || "")) continue;

    set.add(nextUrl.toString());
  }

  return [...set];
}

/** 목록 URL에서 `page`만 제거한 템플릿 (첫 목록 = page 미지정과 동일 취급) */
function categoryListTemplateWithoutPage(url: URL): URL {
  const t = new URL(url.toString());
  t.searchParams.delete("page");
  return t;
}

const MAX_SYNTHETIC_CATEGORY_PAGES = 40;

/**
 * HTML href에 없는 `page=` 목록도 데스커 공식몰 규칙에 맞춰 순회한다.
 * 첫 페이지는 보통 `page` 없음, 이후 `page=1`, `page=2`, … 형태.
 */
async function discoverSyntheticCategoryPageUrls(
  template: URL,
  detailUrlsFromFirstListHtml: string[],
): Promise<string[]> {
  if (template.pathname !== "/products/category") {
    return [];
  }
  const out: string[] = [];
  const seenDetails = new Set<string>(detailUrlsFromFirstListHtml);
  for (let p = 1; p <= MAX_SYNTHETIC_CATEGORY_PAGES; p += 1) {
    const u = new URL(template.toString());
    u.searchParams.set("page", String(p));
    const urlStr = u.toString();
    const html = await fetchHtml(urlStr);
    if (!html) {
      break;
    }
    const details = extractDetailUrls(html);
    if (details.length === 0) {
      break;
    }
    let newCount = 0;
    for (const d of details) {
      if (!seenDetails.has(d)) {
        seenDetails.add(d);
        newCount += 1;
      }
    }
    if (newCount === 0) {
      break;
    }
    out.push(urlStr);
  }
  return out;
}

function extractCategoryUrlsFromProductsPage(baseUrl: URL, html: string): string[] {
  const set = new Set<string>();
  const matches = html.matchAll(/href=["']([^"']*\/products\/category\?[^"']+)["']/gi);
  for (const match of matches) {
    const rawHref = (match[1] ?? "").replace(/&amp;/g, "&").trim();
    if (!rawHref) continue;
    let nextUrl: URL;
    try {
      nextUrl = new URL(rawHref, baseUrl);
    } catch {
      continue;
    }
    if (nextUrl.host !== DESKER_HOST) continue;
    if (nextUrl.pathname !== "/products/category") continue;
    set.add(nextUrl.toString());
  }
  return [...set];
}

function buildCategoryUrlsFromCateNo(baseUrl: URL): string[] {
  const cateNo = (baseUrl.searchParams.get("cateNo") ?? "").trim();
  const subCateNos = CATE_NO_SUBCATEGORY_OVERRIDES[cateNo];
  if (!subCateNos || subCateNos.length === 0) {
    return [];
  }
  return subCateNos.map((subCateNo) => {
    const url = new URL(`https://${DESKER_HOST}/products/category`);
    url.searchParams.set("searchType", "dtl");
    url.searchParams.set("sort", "best");
    url.searchParams.set("subCateNo", subCateNo);
    return url.toString();
  });
}

async function fetchHtml(url: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: { "User-Agent": COLLECTOR_USER_AGENT },
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) {
    return null;
  }
  return response.text();
}

function normalizeText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTopProductSection(html: string): string {
  const markerCandidates = ["상품 필수 정보", "## 상품 필수 정보", "품목 타입"];
  let endIndex = html.length;
  for (const marker of markerCandidates) {
    const idx = html.indexOf(marker);
    if (idx !== -1) {
      endIndex = Math.min(endIndex, idx);
    }
  }
  return html.slice(0, endIndex);
}

function extractProductName(html: string): string {
  const normalized = normalizeText(html);
  const productInfoMatch = normalized.match(/제품명\s+(.+?)\s+(?:크기\/중량|구성품|주요 소재)/);
  if (productInfoMatch?.[1]) {
    return productInfoMatch[1].trim();
  }

  const headingMatch = normalized.match(/#\s+(.+?)\s+[A-Z]{2,}\d{3,}[A-Z0-9]*/);
  if (headingMatch?.[1]) {
    return headingMatch[1].trim();
  }

  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    return titleMatch[1].split("|")[0]!.trim();
  }
  return "";
}

function extractProductCode(text: string): string {
  const candidates = text.match(/[A-Z]{2,}\d{3,}[A-Z0-9]*/g) ?? [];
  if (candidates.length === 0) {
    return "";
  }
  const counts = new Map<string, number>();
  for (const code of candidates) {
    if (code.length < 6) continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? "";
}

function extractColorCodes(html: string, productCode: string): string[] {
  const set = new Set<string>();
  const escapedCode = productCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const codeBased = new RegExp(`${escapedCode}-([A-Z0-9]{2,6})`, "g");
  const codeMatches = html.matchAll(codeBased);
  for (const match of codeMatches) {
    const color = (match[1] ?? "").trim().toUpperCase();
    if (color) set.add(color);
  }

  const text = normalizeText(html);
  const genericMatches = text.match(/\b[A-Z]{4,6}\b/g) ?? [];
  for (const color of genericMatches) {
    if (["BEST", "DIY", "NONE"].includes(color)) continue;
    if (/\d/.test(color)) continue;
    set.add(color);
  }

  return [...set];
}

function extractColorCodesByProductVariant(html: string, productCode: string): string[] {
  const set = new Set<string>();
  const escapedCode = productCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const variantRegex = new RegExp(`${escapedCode}-([A-Z0-9]{2,6})`, "g");
  const matches = html.matchAll(variantRegex);
  for (const match of matches) {
    const color = (match[1] ?? "").trim().toUpperCase();
    if (!color) continue;
    set.add(color);
  }
  return [...set];
}

function extractOptionColorCodesInOrder(text: string): string[] {
  const set = new Set<string>();
  const matches = text.matchAll(/\b([A-Z0-9]{2,6})\s+(\d{5,8})\b/g);
  for (const match of matches) {
    const color = (match[1] ?? "").trim().toUpperCase();
    if (!color) continue;
    if (["BEST", "NONE"].includes(color)) continue;
    set.add(color);
  }
  return [...set];
}

function normalizeProductImageUrl(rawUrl: string): string {
  const cleaned = rawUrl.replace(/&amp;/g, "&").trim();
  if (!cleaned) return "";

  let absolute: URL;
  try {
    if (cleaned.startsWith("//")) {
      absolute = new URL(`https:${cleaned}`);
    } else {
      absolute = new URL(cleaned, `https://${DESKER_HOST}`);
    }
  } catch {
    return "";
  }

  // /resize/{w}x{h}/upload/product/... 는 원본 경로로 정규화
  absolute.pathname = absolute.pathname.replace(
    /^\/resize\/\d+x\d+(\/(?:web\/)?upload\/product\/.+)$/i,
    "$1",
  );
  return absolute.toString();
}

function isProductImageUrl(url: string): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const isDeskerHost = /(^|\.)desker\.co\.kr$/i.test(parsed.host);
  if (!isDeskerHost) return false;

  const pathname = parsed.pathname.toLowerCase();
  const isProductPath = pathname.includes("/upload/product/");
  const isLogoAsset = pathname.includes("/img/user/logo");
  const isImageExt = /\.(png|jpe?g|webp)$/i.test(pathname);
  return isProductPath && isImageExt && !isLogoAsset;
}

function extractImageUrl(html: string): string {
  const productImages = extractProductImageUrls(html);
  return productImages[0] ?? "";
}

function extractProductImageUrls(html: string): string[] {
  const srcMatches = html.matchAll(/<img[^>]+src=["']([^"']+\.(?:png|jpe?g|webp)(?:\?[^"']*)?)["']/gi);
  const deduped = new Set<string>();
  for (const match of srcMatches) {
    const raw = (match[1] ?? "").trim();
    if (!raw) continue;
    const normalized = normalizeProductImageUrl(raw);
    if (!isProductImageUrl(normalized)) continue;
    deduped.add(normalized);
  }
  return [...deduped];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveImageUrlByColor(
  html: string,
  productCode: string,
  colorCode: string,
  fallbackImageUrl: string,
): string {
  const productEscaped = escapeRegex(productCode);
  const colorEscaped = escapeRegex(colorCode);
  const imagePattern = "(https://www\\.desker\\.co\\.kr/(?:upload|web/upload)/product/[^\"'\\s)]+?\\.(?:png|jpe?g|webp))";

  const productColorRegex = new RegExp(
    `${productEscaped}-${colorEscaped}[\\s\\S]{0,900}?${imagePattern}`,
    "i",
  );
  const productColorMatch = html.match(productColorRegex);
  if (productColorMatch?.[1]) {
    return productColorMatch[1];
  }

  const colorOnlyRegex = new RegExp(`${colorEscaped}[\\s\\S]{0,600}?${imagePattern}`, "i");
  const colorOnlyMatch = html.match(colorOnlyRegex);
  if (colorOnlyMatch?.[1]) {
    return colorOnlyMatch[1];
  }

  return fallbackImageUrl;
}

function resolveImagesByOptionOrder(
  colorCodes: string[],
  imageUrls: string[],
): Map<string, string> {
  const result = new Map<string, string>();
  if (colorCodes.length === 0 || imageUrls.length === 0) {
    return result;
  }
  if (imageUrls.length < colorCodes.length) {
    return result;
  }
  for (let i = 0; i < colorCodes.length; i += 1) {
    const color = colorCodes[i];
    const image = imageUrls[i];
    if (!color || !image) continue;
    result.set(color, image);
  }
  return result;
}

function extractConsumerPrice(text: string): number {
  const numeric = text.match(/\b(\d{5,8})\b/g) ?? [];
  const values = numeric.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  const candidate = values.find((value) => value >= 10000 && value <= 10000000);
  return candidate ?? 0;
}

function toRows(detailUrl: string, html: string, categoryLabel: string): CollectedRow[] {
  const topSectionHtml = extractTopProductSection(html);
  const text = normalizeText(html);
  const topText = normalizeText(topSectionHtml);
  const productName = extractProductName(html);
  const productCode = extractProductCode(text);
  const variantColorCodes = extractColorCodesByProductVariant(topSectionHtml, productCode);
  const optionColorCodes = extractOptionColorCodesInOrder(topText);
  const parsedColorCodes = extractColorCodes(html, productCode);
  const colorCodes =
    variantColorCodes.length > 0
      ? variantColorCodes
      : optionColorCodes.length > 0
        ? optionColorCodes
        : parsedColorCodes;
  const imageUrl = extractImageUrl(html);
  const imageCandidates = extractProductImageUrls(topSectionHtml);
  const fallbackImageUrl = imageCandidates[0] ?? imageUrl;
  const optionImageMap = resolveImagesByOptionOrder(colorCodes, imageCandidates);
  const consumerPrice = extractConsumerPrice(text);

  if (!productCode) {
    throw new Error("제품코드를 찾을 수 없습니다.");
  }
  if (!productName) {
    throw new Error("제품명을 찾을 수 없습니다.");
  }
  if (colorCodes.length === 0) {
    throw new Error("색상코드를 찾을 수 없습니다.");
  }

  const colorOverrides = PRODUCT_COLOR_IMAGE_OVERRIDES[productCode];
  if (colorOverrides && colorOverrides.length > 0) {
    return colorOverrides.map((item) => ({
      category: categoryLabel,
      productName,
      productCode,
      colorCode: item.colorCode,
      imageUrl: item.imageUrl,
      consumerPrice,
      detailUrl,
    }));
  }

  return colorCodes.map((colorCode) => ({
    category: categoryLabel,
    productName,
    productCode,
    colorCode,
    imageUrl:
      optionImageMap.get(colorCode) ??
      resolveImageUrlByColor(html, productCode, colorCode, fallbackImageUrl) ??
      fallbackImageUrl,
    consumerPrice,
    detailUrl,
  }));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CollectRequest;
  const categoryUrl = (body.categoryUrl ?? "").trim();
  const maxProducts = Math.max(1, Math.min(300, body.maxProducts ?? 60));

  if (!categoryUrl) {
    return NextResponse.json({ message: "카테고리 URL을 입력해 주세요." }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(categoryUrl);
  } catch {
    return NextResponse.json({ message: "유효한 URL 형식이 아닙니다." }, { status: 400 });
  }

  if (parsedUrl.host !== DESKER_HOST) {
    return NextResponse.json({ message: "desker.co.kr 주소만 수집할 수 있습니다." }, { status: 400 });
  }

  const firstCategoryHtml = await fetchHtml(categoryUrl);
  if (!firstCategoryHtml) {
    return NextResponse.json({ message: "카테고리 페이지를 불러오지 못했습니다." }, { status: 502 });
  }

  const categorySeedUrls = new Set<string>();
  if (parsedUrl.pathname === "/products") {
    const overrideSeedUrls = buildCategoryUrlsFromCateNo(parsedUrl);
    const discovered =
      overrideSeedUrls.length > 0
        ? overrideSeedUrls
        : extractCategoryUrlsFromProductsPage(parsedUrl, firstCategoryHtml);
    for (const url of discovered) {
      categorySeedUrls.add(url);
    }
  } else {
    categorySeedUrls.add(parsedUrl.toString());
  }

  if (categorySeedUrls.size === 0) {
    return NextResponse.json(
      { message: "상위 페이지에서 하위 카테고리를 찾지 못했습니다." },
      { status: 422 },
    );
  }

  const categoryPageUrls = new Set<string>();
  /** 상세 URL → 해당 목록(시드/페이지네이션)에서 파악한 카테고리명 */
  const detailUrlToCategory = new Map<string, string>();
  /** 카테고리 목록 페이지 URL → 카테고리명 (페이지네이션 포함) */
  const pageUrlToCategoryLabel = new Map<string, string>();
  /** 동일 목록 템플릿에 대한 `page=1…` 합성 탐색은 한 번만 수행 */
  const syntheticPagesByTemplate = new Map<string, string[]>();

  const tryAddDetailUrl = (detailUrl: string, categoryLabel: string): boolean => {
    if (detailUrlToCategory.has(detailUrl)) {
      return detailUrlToCategory.size >= maxProducts;
    }
    if (detailUrlToCategory.size >= maxProducts) {
      return true;
    }
    detailUrlToCategory.set(detailUrl, categoryLabel);
    return detailUrlToCategory.size >= maxProducts;
  };

  for (const seedUrl of categorySeedUrls) {
    if (detailUrlToCategory.size >= maxProducts) {
      break;
    }
    const seedParsed = new URL(seedUrl);
    const seedHtml = seedUrl === parsedUrl.toString() ? firstCategoryHtml : await fetchHtml(seedUrl);
    if (!seedHtml) {
      continue;
    }

    const listCategoryLabel = extractCategoryLabelFromListPage(seedHtml, seedParsed);

    const pages = extractPaginationUrls(seedParsed, seedHtml);
    for (const pageUrl of pages) {
      categoryPageUrls.add(pageUrl);
      pageUrlToCategoryLabel.set(pageUrl, listCategoryLabel);
    }

    const listTemplate = categoryListTemplateWithoutPage(seedParsed);
    const templateKey = listTemplate.toString();
    let syntheticPages = syntheticPagesByTemplate.get(templateKey);
    if (!syntheticPages) {
      syntheticPages = await discoverSyntheticCategoryPageUrls(listTemplate, extractDetailUrls(seedHtml));
      syntheticPagesByTemplate.set(templateKey, syntheticPages);
    }
    for (const pageUrl of syntheticPages) {
      if (!categoryPageUrls.has(pageUrl)) {
        categoryPageUrls.add(pageUrl);
        pageUrlToCategoryLabel.set(pageUrl, listCategoryLabel);
      }
    }

    for (const detailUrl of extractDetailUrls(seedHtml)) {
      if (tryAddDetailUrl(detailUrl, listCategoryLabel)) {
        break;
      }
    }
  }

  for (const pageUrl of categoryPageUrls) {
    if (detailUrlToCategory.size >= maxProducts) {
      break;
    }
    let shouldSkip = false;
    for (const seedUrl of categorySeedUrls) {
      if (pageUrl === seedUrl) {
        shouldSkip = true;
        break;
      }
    }
    if (shouldSkip) {
      continue;
    }
    const html = await fetchHtml(pageUrl);
    if (!html) {
      continue;
    }
    let listCategoryLabel = pageUrlToCategoryLabel.get(pageUrl);
    if (!listCategoryLabel?.trim()) {
      try {
        listCategoryLabel = extractCategoryLabelFromListPage(html, new URL(pageUrl));
      } catch {
        listCategoryLabel = extractCategoryLabelFromListPage(html);
      }
    }
    for (const detailUrl of extractDetailUrls(html)) {
      if (tryAddDetailUrl(detailUrl, listCategoryLabel)) {
        break;
      }
    }
  }

  const detailUrls = [...detailUrlToCategory.keys()].slice(0, maxProducts);
  if (detailUrls.length === 0) {
    return NextResponse.json({ message: "카테고리에서 상품 상세 URL을 찾지 못했습니다." }, { status: 422 });
  }

  const rows: CollectedRow[] = [];
  const failures: FailedRow[] = [];

  for (const detailUrl of detailUrls) {
    const detailHtml = await fetchHtml(detailUrl);
    if (!detailHtml) {
      failures.push({ detailUrl, reason: "상세 페이지 응답 실패" });
      continue;
    }
    try {
      const categoryLabel = detailUrlToCategory.get(detailUrl) ?? "";
      const parsedRows = toRows(detailUrl, detailHtml, categoryLabel);
      rows.push(...parsedRows);
    } catch (error) {
      failures.push({
        detailUrl,
        reason: error instanceof Error ? error.message : "파싱 실패",
      });
    }
  }

  const deduped = new Map<string, CollectedRow>();
  for (const row of rows) {
    const key = `${row.productCode}|${row.colorCode}`;
    deduped.set(key, row);
  }

  return NextResponse.json({
    categoryUrl,
    categorySeedCount: categorySeedUrls.size,
    categoryPageCount: categoryPageUrls.size,
    detailPageCount: detailUrls.length,
    successCount: deduped.size,
    failCount: failures.length,
    rows: [...deduped.values()].sort((a, b) => {
      const byCat = a.category.localeCompare(b.category);
      if (byCat !== 0) {
        return byCat;
      }
      const byName = a.productName.localeCompare(b.productName);
      if (byName !== 0) {
        return byName;
      }
      const byCode = a.productCode.localeCompare(b.productCode);
      if (byCode !== 0) {
        return byCode;
      }
      return a.colorCode.localeCompare(b.colorCode);
    }),
    failures,
  });
}
