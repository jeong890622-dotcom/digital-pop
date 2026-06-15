/** 관리자 비밀번호 초기화 규칙: 등록 핸드폰 번호 + @ */
export function toResetPassword(phone: string): string {
  return `${phone.trim()}@`;
}
