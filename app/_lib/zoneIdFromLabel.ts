/**
 * 진열/QR에서 쓰는 ZONE 표시 문자열 → URL·카탈로그의 `zoneId` 슬러그.
 * 이미 `zone-` 으로 시작하면 그대로 사용해 `zone-zone-a` 같은 중복을 막는다.
 */
export function zoneIdFromLabel(label: string): string {
  const normalized = label.trim().toLowerCase().replace(/\s+/g, "-");
  if (!normalized) return "";
  if (normalized.startsWith("zone-")) {
    return normalized;
  }
  return `zone-${normalized}`;
}
