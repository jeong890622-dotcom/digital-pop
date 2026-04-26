import Image from "next/image";
import type { Product } from "../../_data/mockProducts";
import { formatPrice } from "../../_lib/formatPrice";
import { resolveProductBadges } from "../../_lib/productBadges";
import { useProductEventRules } from "../../_lib/productEventStore";

type ProductCardProps = {
  product: Product;
  onSelect: () => void;
};

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const [rules] = useProductEventRules();
  const badges = resolveProductBadges(product.code, rules);
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
          {badges.length > 0 ? (
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {badges.map((badge) => (
                <span
                  key={`${product.id}-${badge.type}`}
                  className={`rounded-sm border px-1.5 py-0.5 text-[10px] leading-none ${
                    badge.type === "wall-required"
                      ? "border-[#E5E5E5] bg-[#F5F5F5] text-[#111111]"
                      : badge.type === "new"
                        ? "border-[#D9D9D9] bg-white text-[#111111]"
                        : "border-[#D9D9D9] bg-white text-[#666666]"
                  }`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </article>
    </button>
  );
}
