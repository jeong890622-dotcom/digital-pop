/** 신규 QR은 운영 허브 고객 화면으로 연다. 이미 생성된 Vercel QR은 그대로 둔다. */
export const CUSTOMER_QR_ORIGIN = "https://desker-digital-pop.app1.hub.fursys.com";

export function buildCustomerQrUrl(params: {
  qrId: string;
  storeId: string;
  zoneId: string;
}): string {
  const search = new URLSearchParams({
    qrId: params.qrId,
    storeId: params.storeId,
    zoneId: params.zoneId,
    areaId: params.zoneId,
  });
  return `${CUSTOMER_QR_ORIGIN}/?${search.toString()}`;
}
