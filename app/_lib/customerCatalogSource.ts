let preferCatalogApi = false;

/** 고객 홈에서만 호출. 상품 마스터·진열을 Supabase 대신 /api/catalog 로 채운다. */
export function enableCustomerCatalogApi(): void {
  preferCatalogApi = true;
}

export function isCustomerCatalogApiEnabled(): boolean {
  return preferCatalogApi;
}

export function disableCustomerCatalogApi(): void {
  preferCatalogApi = false;
}
