type QuoteExpiryNoticeProps = {
  message: string;
  onDismiss: () => void;
};

export function QuoteExpiryNotice({ message, onDismiss }: QuoteExpiryNoticeProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-[#E5E5E5] bg-[#F5F5F5] px-4 py-2.5 sm:px-6 lg:px-10"
    >
      <div className="mx-auto flex max-w-[min(100%,1440px)] items-start justify-between gap-3">
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-[#111111]">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs text-[#666666] underline-offset-2 hover:text-[#111111] hover:underline"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
