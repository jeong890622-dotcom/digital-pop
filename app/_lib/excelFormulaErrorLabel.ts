/** Excel에 표시되는 오류 결과 문자열(복사 시 값으로 들어오기 쉬움) */

export function looksLikeExcelErrorCell(value: string): boolean {
  const t = value.trim().toUpperCase();
  if (!t.startsWith("#")) return false;
  return (
    t === "#REF!" ||
    t === "#DIV/0!" ||
    t.startsWith("#N/A") ||
    t === "#VALUE!" ||
    t === "#NAME?" ||
    t === "#NUM!" ||
    t === "#NULL!" ||
    t === "#GETTING_DATA"
  );
}

export const EXCEL_ERROR_CELL_HINT =
  "Excel 수식 오류값(#REF! 등)입니다. 엑셀에서 해당 셀을 값만 복사하거나 수식을 제거한 뒤 다시 입력해 주세요.";
