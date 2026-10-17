/** 고객 카드 이미지는 CDN 주소를 써야 Next 최적화가 열 수 있다. */
export function toCustomerImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return trimmed.replace(/^https?:\/\/www\.desker\.co\.kr(?=\/|$)/i, "https://cdn.desker.co.kr");
}
