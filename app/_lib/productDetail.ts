import type { Product } from "../_data/mockProducts";
import type { ProductDetailSelection } from "../_types/productDetail";

export function getInitialDetailSelection(product: Product): ProductDetailSelection {
  const defaultSizeId = (() => {
    if (!product.hasSize) {
      return "standard";
    }

    const matchedByProductCode = product.sizes.find(
      (size) => size.productCode?.toLowerCase() === product.code.toLowerCase(),
    );

    return matchedByProductCode?.id ?? (product.sizes[0]?.id ?? null);
  })();

  return {
    colorId: product.initialColorCode || (product.colors[0]?.id ?? null),
    sizeId: defaultSizeId,
    quantity: 1,
  };
}

export function getSelectedSizePrice(product: Product, sizeId: string | null): number {
  if (!product.hasSize) {
    return product.membershipPrice;
  }

  const selectedSize = product.sizes.find((size) => size.id === sizeId);
  return selectedSize?.price ?? product.membershipPrice;
}

export function getSelectedConsumerPrice(product: Product, sizeId: string | null): number {
  if (!product.hasSize) {
    return product.consumerPrice;
  }

  const selectedSize = product.sizes.find((size) => size.id === sizeId);
  return selectedSize?.consumerPrice ?? product.consumerPrice;
}

export function getSelectedProductCode(
  product: Product,
  sizeId: string | null,
): string {
  if (!product.hasSize) {
    return product.code;
  }

  const selectedSize = product.sizes.find((size) => size.id === sizeId);
  return selectedSize?.productCode ?? product.code;
}

export function getSelectedColorImageUrl(
  product: Product,
  colorId: string | null,
  sizeId: string | null,
): string {
  const selectedProductCode = getSelectedProductCode(product, sizeId).toLowerCase();
  const selectedColorCode = (colorId || product.initialColorCode || "").toLowerCase();
  if (!selectedProductCode || !selectedColorCode) {
    return product.imageUrl;
  }

  const matched = product.skuImageMap[`${selectedProductCode}|${selectedColorCode}`];
  if (matched) {
    return matched;
  }

  const selectedColor = product.colors.find((color) => color.id.toLowerCase() === selectedColorCode);
  return selectedColor?.imageUrl ?? product.imageUrl;
}

export function getLineTotal(price: number, quantity: number): number {
  return price * quantity;
}

export function isDisplayedInStore(
  displayedProductCodes: string[],
  productCode: string,
): boolean {
  return displayedProductCodes.includes(productCode);
}
