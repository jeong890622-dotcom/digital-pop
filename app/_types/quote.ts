export type QuoteItem = {
  productId: string;
  productCode: string;
  colorId: string | null;
  colorLabel: string;
  sizeId: string | null;
  sizeLabel: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type AddToQuotePayload = {
  productId: string;
  productCode: string;
  colorId: string | null;
  colorLabel: string;
  sizeId: string | null;
  sizeLabel: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};
