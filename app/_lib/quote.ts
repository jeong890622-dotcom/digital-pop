import type { AddToQuotePayload, QuoteItem } from "../_types/quote";

function sameLineKey(a: QuoteItem, b: AddToQuotePayload): boolean {
  return (
    a.productId === b.productId &&
    a.colorId === b.colorId &&
    a.sizeId === b.sizeId &&
    a.productCode === b.productCode
  );
}

export function addOrMergeQuoteItem(
  items: QuoteItem[],
  payload: AddToQuotePayload,
): QuoteItem[] {
  const index = items.findIndex((item) => sameLineKey(item, payload));
  if (index === -1) {
    return [
      ...items,
      {
        productId: payload.productId,
        productCode: payload.productCode,
        colorId: payload.colorId,
        colorLabel: payload.colorLabel,
        sizeId: payload.sizeId,
        sizeLabel: payload.sizeLabel,
        productName: payload.productName,
        quantity: payload.quantity,
        unitPrice: payload.unitPrice,
        lineTotal: payload.lineTotal,
      },
    ];
  }

  return items.map((item, i) => {
    if (i !== index) {
      return item;
    }
    const quantity = item.quantity + payload.quantity;
    const lineTotal = item.lineTotal + payload.lineTotal;
    const unitPrice = Math.round(lineTotal / quantity);
    return {
      ...item,
      quantity,
      lineTotal,
      unitPrice,
    };
  });
}

export function sumQuoteQuantities(items: QuoteItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function sumQuoteLineTotals(items: QuoteItem[]): number {
  return items.reduce((sum, item) => sum + item.lineTotal, 0);
}

export function removeQuoteItemAtIndex(
  items: QuoteItem[],
  index: number,
): QuoteItem[] {
  return items.filter((_, i) => i !== index);
}

export function updateQuoteItemQuantity(
  items: QuoteItem[],
  index: number,
  quantity: number,
): QuoteItem[] {
  const nextQuantity = Math.max(1, quantity);
  return items.map((item, i) => {
    if (i !== index) {
      return item;
    }
    const lineTotal = Math.round(item.unitPrice * nextQuantity);
    return {
      ...item,
      quantity: nextQuantity,
      lineTotal,
    };
  });
}
