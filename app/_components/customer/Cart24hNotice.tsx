import { customerBodyText, customerContentPadding } from "../../_lib/deskerTokens";

type Cart24hNoticeProps = {
  visible: boolean;
};

export function Cart24hNotice({ visible }: Cart24hNoticeProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className={`${customerContentPadding} min-h-10 bg-[#E4E0D6] py-2`}>
      <p className={`px-4 sm:px-6 ${customerBodyText} text-[#B1A78A]`}>
        장바구니에 담긴 상품은 24시간 동안 보관됩니다.
      </p>
    </div>
  );
}
