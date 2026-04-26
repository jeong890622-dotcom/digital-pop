import type { Product } from "../_data/mockProducts";

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function filterProductsByZone(
  products: Product[],
  zoneId: string,
): Product[] {
  return products.filter((product) => product.zoneId === zoneId);
}

export function searchProductsInStore(
  products: Product[],
  query: string,
): Product[] {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return products;
  }

  return products.filter((product) => {
    return (
      product.name.toLowerCase().includes(normalized) ||
      product.code.toLowerCase().includes(normalized)
    );
  });
}
