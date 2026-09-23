/** 고객 화면·인쇄 QR의 고정 도메인. 운영 허브 origin과 분리한다. */
export const CUSTOMER_QR_ORIGIN = "https://digital-pop.vercel.app";

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
