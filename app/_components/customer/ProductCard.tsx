import Image from "next/image";
import type { Product } from "../../_data/mockProducts";
import { customerBodyMedium, customerBodyText, customerCardTitleHover } from "../../_lib/deskerTokens";
import { formatPrice } from "../../_lib/formatPrice";
import { stripSizeMillimeterSuffix } from "../../_lib/formatSizeLabel";
import { resolveProductBadges } from "../../_lib/productBadges";
import { useProductEventRules } from "../../_lib/productEventStore";
import { ProductBadgeStrip } from "./ProductBadgeStrip";

type ProductCardProps = {
  product: Product;
  onSelect: () => void;
};

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const [rules] = useProductEventRules();
  const badges = resolveProductBadges(product.code, rules);
  const safeImageSrc = !product.imageUrl.trim() ? "/window.svg" : product.imageUrl;
  const sizeDisplay = stripSizeMillimeterSuffix(product.size);
  const normalizedSize = sizeDisplay.replace(/\s+/g, "");
  const showSizeLine =
    normalizedSize.length > 0 && !/^0(?:[xX*]0)*$/.test(normalizedSize);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="customer-product-card group flex h-full w-full min-w-0 max-w-full flex-col overflow-hidden text-left"
      aria-label={`${product.name} 상세 보기`}
    >
      <article className="flex h-full min-w-0 w-full flex-col">
        <div className="customer-product-card-image relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[#F0F0F0]">
          <Image
            src={safeImageSrc}
            alt={product.name}
            fill
            className="object-contain object-left object-top p-3 md:p-4"
            sizes="(orientation: portrait) 30vw, (max-width: 767px) 45vw, (max-width: 1023px) 30vw, 22vw"
          />
        </div>
        <div className="customer-product-card-body flex min-w-0 flex-1 flex-col pt-2">
          <h3
            className={`customer-product-card-title line-clamp-2 break-words ${customerBodyMedium} ${customerCardTitleHover}`}
          >
            {product.name}
          </h3>
          <p className={`customer-product-card-size mt-1 ${customerBodyText}`}>
            {showSizeLine ? sizeDisplay : "\u00A0"}
          </p>
          <p className={`customer-product-card-price mt-1 ${customerBodyMedium}`}>
            {formatPrice(product.membershipPrice)}
          </p>
          <div className="customer-product-card-badges mt-2 min-h-[1.375rem]">
            <ProductBadgeStrip badges={badges} variant="card" />
          </div>
        </div>
      </article>
    </button>
  );
}
