type AdminPagePlaceholderProps = {
  title: string;
  description?: string;
};

/** 상세 화면 구현 전 — 운영툴형 틀만 */
export function AdminPagePlaceholder({
  title,
  description = "화면은 추후 구현 예정입니다.",
}: AdminPagePlaceholderProps) {
  return (
    <div>
      <h1 className="text-lg font-semibold text-[#111111]">{title}</h1>
      <p className="mt-1 text-sm text-[#666666]">{description}</p>

      <div className="mt-6 flex flex-wrap items-end gap-3 border-b border-[#E5E5E5] pb-4">
        <div className="flex min-w-[140px] flex-col gap-1">
          <label className="text-xs text-[#888888]">검색</label>
          <input
            type="search"
            disabled
            placeholder="제품명·코드"
            className="rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-1.5 text-sm text-[#888888]"
          />
        </div>
        <div className="flex min-w-[120px] flex-col gap-1">
          <label className="text-xs text-[#888888]">필터</label>
          <select
            disabled
            className="rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-1.5 text-sm text-[#888888]"
            defaultValue=""
          >
            <option value="">전체</option>
          </select>
        </div>
        <button
          type="button"
          disabled
          className="rounded-sm border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#888888]"
        >
          적용
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-sm border border-[#E5E5E5]">
        <table className="w-full min-w-[480px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5] bg-[#F5F5F5]">
              <th className="px-3 py-2 text-xs font-medium text-[#666666]">항목</th>
              <th className="px-3 py-2 text-xs font-medium text-[#666666]">상태</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#E5E5E5]">
              <td className="px-3 py-8 text-center text-sm text-[#888888]" colSpan={2}>
                등록된 데이터가 없습니다.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
