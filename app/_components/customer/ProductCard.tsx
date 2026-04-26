import Image from "next/image";
import type { Product } from "../../_data/mockProducts";
import { formatPrice } from "../../_lib/formatPrice";

type ProductCardProps = {
  product: Product;
  onSelect: () => void;
};

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const safeImageSrc =
    !product.imageUrl.trim()
      ? "/window.svg"
      : product.imageUrl;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left"
      aria-label={`${product.name} 상세 보기`}
    >
      <article className="group">
        <div className="flex aspect-square items-center justify-center bg-white">
          <Image
            src={safeImageSrc}
            alt={product.name}
            width={140}
            height={140}
            className="scale-[2.2] object-contain contrast-115 saturate-110"
          />
        </div>
        <div className="pt-3 text-center">
          <h3 className="line-clamp-2 text-sm font-medium text-[#111111] group-hover:opacity-80">
            {product.name}
          </h3>
          <p className="mt-1 text-xs text-[#666666]">{product.size}</p>
          <p className="mt-2 text-sm font-semibold text-[#111111]">
            {formatPrice(product.membershipPrice)}
          </p>
        </div>
      </article>
    </button>
  );
}
