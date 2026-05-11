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
  /** true면 선택 불가 (예: 연동 SKU에 없는 색상) */
  disabled?: boolean;
};

export type ProductDetailSelection = {
  colorId: string | null;
  sizeId: string | null;
  quantity: number;
};
