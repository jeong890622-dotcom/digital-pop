import type { Product } from "../../_data/mockProducts";
import { customerContentPadding, customerMutedText } from "../../_lib/deskerTokens";
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
  const stateClass = `${customerContentPadding} py-8 ${customerMutedText}`;

  if (isLoading) {
    return <section className={stateClass}>불러오는 중...</section>;
  }

  if (errorMessage) {
    return <section className={stateClass}>{errorMessage}</section>;
  }

  if (products.length === 0) {
    return <section className={stateClass}>조건에 맞는 상품이 없습니다.</section>;
  }

  return (
    <section
      className={`grid grid-cols-2 items-stretch gap-x-3 gap-y-8 pb-24 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-10 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-12 ${customerContentPadding}`}
    >
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
