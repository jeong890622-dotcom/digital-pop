import type { ProductMasterRow } from "../_data/mockProductMaster";
import type { StoreRow } from "./supabaseAdmin";
import type { StoreOperationRowsByStore } from "./storeOperationStore";
import type { ProductGroupOptionRule } from "../_types/productGroupOption";
import type { ProductEventRules } from "../_types/productBadge";

export type CustomerCatalogPayload = {
  ok: boolean;
  stores: StoreRow[];
  productMaster: ProductMasterRow[];
  merchandising: StoreOperationRowsByStore;
  groupOptions: ProductGroupOptionRule[];
  eventRules: ProductEventRules;
};

export async function fetchCustomerCatalog(): Promise<CustomerCatalogPayload | null> {
  const response = await fetch("/api/catalog", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;
  const body = (await response.json().catch(() => null)) as CustomerCatalogPayload | null;
  if (!body || body.ok !== true) return null;
  if (!Array.isArray(body.productMaster) || !body.merchandising || typeof body.merchandising !== "object") {
    return null;
  }
  return body;
}
