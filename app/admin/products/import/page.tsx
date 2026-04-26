const EXCEL_COLUMNS = [
  "상품군코드",
  "상품군명",
  "제품명",
  "제품코드",
  "색상코드",
  "사이즈",
  "이미지 URL",
  "소비자가",
  "멤버십 가격",
  "상세 URL",
];

export default function AdminProductsImportPage() {
  return (
    <section>
      <h1 className="text-lg font-semibold text-[#111111]">상품 엑셀 업로드</h1>
      <p className="mt-1 text-sm text-[#666666]">
        엑셀 및 내부 저장 기준은 1행 = 1 SKU/옵션입니다.
      </p>

      <div className="mt-5 rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] p-4">
        <p className="text-xs font-medium text-[#666666]">행 매핑 기준</p>
        <p className="mt-2 text-sm text-[#111111]">
          제품 1건 등록 시 색상 옵션을 여러 개 입력할 수 있지만, 저장/업로드 시에는 색상마다
          행이 분리됩니다.
        </p>
        <p className="mt-2 text-xs text-[#666666]">
          목록 화면에서는 동일 제품코드를 1건으로 묶어 표시하고, 색상/이미지는 편집 화면에서만 관리합니다.
        </p>
        <p className="mt-1 text-xs text-[#666666]">
          예: 베이직데스크 1400 + 화이트/블랙/메이플 업로드 → 내부 3행 저장, 목록 1행 표시
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-sm border border-[#E5E5E5]">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E5E5E5] bg-white">
              <th className="px-3 py-2 text-xs font-medium text-[#666666]">순서</th>
              <th className="px-3 py-2 text-xs font-medium text-[#666666]">엑셀 컬럼</th>
              <th className="px-3 py-2 text-xs font-medium text-[#666666]">설명</th>
            </tr>
          </thead>
          <tbody>
            {EXCEL_COLUMNS.map((column, index) => (
              <tr key={column} className="border-b border-[#E5E5E5] last:border-b-0">
                <td className="px-3 py-2 text-xs text-[#666666]">{index + 1}</td>
                <td className="px-3 py-2 text-sm text-[#111111]">{column}</td>
                <td className="px-3 py-2 text-xs text-[#666666]">
                  {column === "색상코드" || column === "이미지 URL"
                    ? "색상 옵션 단위 입력값"
                    : "공통 정보(색상별 행에 복제)"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
