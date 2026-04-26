import type { QuoteItem } from "../_types/quote";

export const QUOTE_STORAGE_KEY = "digital-pop:quote-items";

type StoredQuote = {
  expiresAt: number;
  items: QuoteItem[];
};

function getNextMidnightTimestamp(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime();
}

export function getMsUntilNextMidnight(now = new Date()): number {
  return Math.max(1000, getNextMidnightTimestamp(now) - now.getTime());
}

export type StoredQuoteRead = {
  items: QuoteItem[];
  /** 저장된 견적이 당일 자정 만료로 삭제된 경우 true */
  wasExpired: boolean;
};

export function readStoredQuoteState(): StoredQuoteRead {
  if (typeof window === "undefined") {
    return { items: [], wasExpired: false };
  }

  const raw = window.localStorage.getItem(QUOTE_STORAGE_KEY);
  if (!raw) {
    return { items: [], wasExpired: false };
  }

  try {
    const parsed = JSON.parse(raw) as StoredQuote;
    if (!Array.isArray(parsed.items) || typeof parsed.expiresAt !== "number") {
      window.localStorage.removeItem(QUOTE_STORAGE_KEY);
      return { items: [], wasExpired: false };
    }

    if (Date.now() >= parsed.expiresAt) {
      const hadItems = parsed.items.length > 0;
      window.localStorage.removeItem(QUOTE_STORAGE_KEY);
      return { items: [], wasExpired: hadItems };
    }

    return { items: parsed.items, wasExpired: false };
  } catch {
    window.localStorage.removeItem(QUOTE_STORAGE_KEY);
    return { items: [], wasExpired: false };
  }
}

export function readStoredQuoteItems(): QuoteItem[] {
  return readStoredQuoteState().items;
}

export function writeStoredQuoteItems(items: QuoteItem[]): void {
  if (typeof window === "undefined") {
    return;
  }

  if (items.length === 0) {
    window.localStorage.removeItem(QUOTE_STORAGE_KEY);
    return;
  }

  const payload: StoredQuote = {
    expiresAt: getNextMidnightTimestamp(),
    items,
  };
  window.localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(payload));
}
