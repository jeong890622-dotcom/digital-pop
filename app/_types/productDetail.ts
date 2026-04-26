export type ProductOption = {
  id: string;
  label: string;
  productCode?: string;
  optionCode?: string;
  imageUrl?: string;
  price?: number;
  detailUrl?: string;
  /** SKU별 소비자가. 상품 상세에서만 사용 */
  consumerPrice?: number;
};

export type ProductDetailSelection = {
  colorId: string | null;
  sizeId: string | null;
  quantity: number;
};
