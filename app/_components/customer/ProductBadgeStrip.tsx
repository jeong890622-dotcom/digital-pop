import type { ProductBadge, ProductBadgeType } from "../../_types/productBadge";
import {
  customerBadgeText,
  customerPanelButtonHeight,
  customerPanelButtonText,
} from "../../_lib/deskerTokens";

const BADGE_CLASS: Record<ProductBadgeType, string> = {
  new: "bg-[#FFDC1E] text-[#282828]",
  best: "bg-[#336DFF] text-white",
  promotion: "bg-[#F72B35] text-white",
  "wall-required": "bg-[#FF5948] text-white",
  "display-sale": "bg-[#B3B3B3] text-[#282828]",
};

type ProductBadgeStripProps = {
  badges: ProductBadge[];
  className?: string;
  variant?: "card" | "detail" | "cart";
};

export function ProductBadgeStrip({
  badges,
  className = "",
  variant = "card",
}: ProductBadgeStripProps) {
  if (badges.length === 0) {
    return null;
  }

  const isDetail = variant === "detail";
  const itemClass = isDetail
    ? `inline-flex ${customerPanelButtonHeight} items-center justify-center px-5 font-medium ${customerPanelButtonText}`
    : `inline-flex items-center justify-center px-2 py-1 ${customerBadgeText} font-medium`;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`.trim()}>
      {badges.map((badge) => (
        <span
          key={`${badge.type}-${badge.label}`}
          className={`${itemClass} ${BADGE_CLASS[badge.type]}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
