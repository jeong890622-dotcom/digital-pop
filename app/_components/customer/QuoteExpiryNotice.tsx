import {
  customerAttentionText,
  customerBodyMedium,
  customerCapsLabel,
  customerContentPadding,
  customerTextHoverUnderline,
} from "../../_lib/deskerTokens";

type QuoteExpiryNoticeProps = {
  message: string;
  onDismiss: () => void;
};

export function QuoteExpiryNotice({ message, onDismiss }: QuoteExpiryNoticeProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${customerContentPadding} min-h-10 bg-[#FFDEDA] py-2`}
    >
      <div className="flex items-start justify-between gap-3 px-4 sm:px-6">
        <p className={`min-w-0 flex-1 ${customerAttentionText}`}>{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className={`shrink-0 ${customerCapsLabel} !text-[#FF5948] ${customerTextHoverUnderline}`}
        >
          OK
        </button>
      </div>
    </div>
  );
}
