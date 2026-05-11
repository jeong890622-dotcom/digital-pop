export type ProductGroupRegistryEntry = {
  id: string;
  /** 불변 식별용 코드 (신규는 PG-AUTO-000001 형식 자동 부여) */
  productGroupCode: string;
  productGroupName: string;
  /**
   * 켜면 상품군별 옵션 관리의 「옵션 추가」에서 이 상품군명을 선택할 수 있다.
   * 저장 데이터에 없으면 false로 본다.
   */
  usesOptionRules?: boolean;
};
