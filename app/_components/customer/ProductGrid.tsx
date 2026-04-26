import type { Product } from "../../_data/mockProducts";
import { ProductCard } from "./ProductCard";

type ProductGridProps = {
  products: Product[];
  isLoading: boolean;
  errorMessage: string | null;
  onSelectProduct: (productId: string) => void;
};

export function ProductGrid({
  products,
  isLoading,
  errorMessage,
  onSelectProduct,
}: ProductGridProps) {
  if (isLoading) {
    return (
      <section className="px-4 py-8 text-sm text-[#666666] sm:px-6 lg:px-10">
        불러오는 중...
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="px-4 py-8 text-sm text-[#666666] sm:px-6 lg:px-10">
        {errorMessage}
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="px-4 py-8 text-sm text-[#666666] sm:px-6 lg:px-10">
        조건에 맞는 상품이 없습니다.
      </section>
    );
  }

  return (
    <section className="grid grid-cols-2 gap-x-3 gap-y-6 px-4 pb-24 pt-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-7 sm:px-6 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-8 lg:px-10 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={() => onSelectProduct(product.id)}
        />
      ))}
    </section>
  );
}
