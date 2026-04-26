import { Suspense } from "react";
import { ProductMasterScreen } from "../../_components/admin/ProductMasterScreen";

function ProductMasterFallback() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-7 w-40 rounded-sm bg-[#E5E5E5]" />
      <div className="h-24 rounded-sm border border-[#E5E5E5] bg-[#F5F5F5]" />
      <div className="h-48 rounded-sm border border-[#E5E5E5] bg-[#F5F5F5]" />
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<ProductMasterFallback />}>
      <ProductMasterScreen />
    </Suspense>
  );
}
