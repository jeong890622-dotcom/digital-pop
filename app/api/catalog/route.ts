import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const HUB_CATALOG_URL = "https://desker-digital-pop.app1.hub.fursys.com/api/catalog";
const FETCH_PAGE_SIZE = 1000;
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function resolveUpstream(request: Request): string | null {
  const explicit = (process.env.CATALOG_UPSTREAM_URL ?? "").trim();
  const candidate = explicit || (process.env.VERCEL ? HUB_CATALOG_URL : "");
  if (!candidate) return null;
  try {
    const upstream = new URL(candidate);
    const selfOrigin = new URL(request.url).origin;
    if (upstream.origin === selfOrigin) return null;
    return upstream.toString();
  } catch {
    return null;
  }
}

async function proxyUpstream(upstreamUrl: string): Promise<NextResponse> {
  const upstream = await fetch(upstreamUrl, { cache: "no-store" }).catch(() => null);
  if (!upstream?.ok) {
    return withCors(
      NextResponse.json(
        { ok: false, message: "운영 상품 목록을 불러오지 못했습니다." },
        { status: 502 },
      ),
    );
  }
  const body = await upstream.arrayBuffer();
  return withCors(
    new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    }),
  );
}

type ProductMasterDbRow = {
  id: string;
  category?: string | null;
  product_group_code: string;
  product_group_name: string;
  product_name: string;
  product_code: string;
  color_code: string;
  size_label: string;
  image_url: string;
  consumer_price: number;
  membership_price: number;
  detail_url: string;
};

async function fetchPaged(
  client: ReturnType<typeof createClient>,
  table: string,
  columns: string,
  orderCols: string[],
): Promise<Record<string, unknown>[]> {
  const collected: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const to = from + FETCH_PAGE_SIZE - 1;
    let query = client.from(table).select(columns);
    for (const col of orderCols) {
      query = query.order(col, { ascending: true });
    }
    const { data, error } = await query.range(from, to);
    if (error || !data) break;
    for (const row of data as Record<string, unknown>[]) {
      collected.push(row);
    }
    if (data.length < FETCH_PAGE_SIZE) break;
    from += FETCH_PAGE_SIZE;
  }
  return collected;
}

async function buildLocalCatalog(): Promise<NextResponse> {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !key) {
    return withCors(
      NextResponse.json({ ok: false, message: "상품 데이터에 연결할 수 없습니다." }, { status: 503 }),
    );
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let masterRows = await fetchPaged(
    client,
    "product_master",
    "id, category, product_group_code, product_group_name, product_name, product_code, color_code, size_label, image_url, consumer_price, membership_price, detail_url",
    ["product_group_name", "product_code", "color_code", "size_label"],
  );
  if (masterRows.length === 0) {
    masterRows = await fetchPaged(
      client,
      "product_master",
      "id, product_group_code, product_group_name, product_name, product_code, color_code, size_label, image_url, consumer_price, membership_price, detail_url",
      ["product_group_name", "product_code", "color_code", "size_label"],
    );
  }

  const productMaster = masterRows.map((row) => {
    const r = row as unknown as ProductMasterDbRow;
    return {
      id: r.id,
      category: (r.category ?? "").trim(),
      productGroupCode: r.product_group_code ?? "",
      productGroupName: r.product_group_name ?? "",
      productName: r.product_name ?? "",
      productCode: r.product_code ?? "",
      colorCode: r.color_code ?? "",
      sizeLabel: r.size_label ?? "",
      imageUrl: r.image_url ?? "",
      consumerPrice:
        typeof r.consumer_price === "number" && Number.isFinite(r.consumer_price) ? r.consumer_price : 0,
      membershipPrice:
        typeof r.membership_price === "number" && Number.isFinite(r.membership_price)
          ? r.membership_price
          : 0,
      detailUrl: r.detail_url ?? "",
    };
  });

  let merchRows = await fetchPaged(
    client,
    "store_zone_merchandising",
    "store_id, zone, product_code, color_code, sort_order",
    ["store_id", "zone", "product_code", "color_code"],
  );
  if (merchRows.length === 0) {
    merchRows = await fetchPaged(
      client,
      "store_zone_merchandising",
      "store_id, zone, product_code, color_code",
      ["store_id", "zone", "product_code", "color_code"],
    );
  }

  const merchandising: Record<
    string,
    Array<{
      storeId: string;
      zone: string;
      productCode: string;
      colorCode: string;
      sortOrder: number | null;
    }>
  > = {};
  for (const row of merchRows) {
    const storeId = String(row.store_id ?? "").trim();
    const zone = String(row.zone ?? "").trim();
    const productCode = String(row.product_code ?? "").trim();
    const colorCode = String(row.color_code ?? "").trim();
    if (!storeId || !zone || !productCode || !colorCode) continue;
    const sortRaw = row.sort_order;
    const list = merchandising[storeId] ?? (merchandising[storeId] = []);
    list.push({
      storeId,
      zone,
      productCode,
      colorCode,
      sortOrder: typeof sortRaw === "number" && Number.isFinite(sortRaw) ? sortRaw : null,
    });
  }

  const { data: storeRows } = await client.from("stores").select("id, code, name").order("name", {
    ascending: true,
  });

  const optionRows = await fetchPaged(
    client,
    "product_group_options",
    "id, group_name, size_label, option_name, linked_product_code, sort_order, is_active",
    ["group_name", "size_label", "sort_order", "option_name"],
  );
  const groupOptions = optionRows.map((row) => ({
    id: String(row.id ?? ""),
    groupName: String(row.group_name ?? ""),
    sizeLabel: String(row.size_label ?? "Standard") || "Standard",
    optionName: String(row.option_name ?? ""),
    linkedProductCode: String(row.linked_product_code ?? ""),
    sortOrder: typeof row.sort_order === "number" && Number.isFinite(row.sort_order) ? row.sort_order : 0,
    isActive: row.is_active !== false,
  }));

  const eventRows = await fetchPaged(client, "product_event_rules", "id, kind, product_code", ["id"]);
  const wallRequiredProductCodes: string[] = [];
  const newProductCodes: string[] = [];
  const bestProductCodes: string[] = [];
  const promotionProductCodes: string[] = [];
  const displaySaleProductCodes: string[] = [];
  for (const row of eventRows) {
    const code = String(row.product_code ?? "").trim();
    if (!code) continue;
    const kind = String(row.kind ?? "");
    if (kind === "wall-required") wallRequiredProductCodes.push(code);
    else if (kind === "new") newProductCodes.push(code);
    else if (kind === "best") bestProductCodes.push(code);
    else if (kind === "promotion") promotionProductCodes.push(code);
    else if (kind === "display-sale") displaySaleProductCodes.push(code);
  }

  return withCors(
    NextResponse.json({
      ok: true,
      stores: storeRows ?? [],
      productMaster,
      merchandising,
      groupOptions,
      eventRules: {
        wallRequiredProductCodes: [...new Set(wallRequiredProductCodes)],
        newProductCodes: [...new Set(newProductCodes)],
        bestProductCodes: [...new Set(bestProductCodes)],
        promotionProductCodes: [...new Set(promotionProductCodes)],
        displaySaleProductCodes: [...new Set(displaySaleProductCodes)],
      },
    }),
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const upstream = resolveUpstream(request);
  if (upstream) {
    return proxyUpstream(upstream);
  }
  return buildLocalCatalog();
}
