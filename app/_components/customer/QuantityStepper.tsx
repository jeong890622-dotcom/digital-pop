import {
  customerBadgeText,
  customerMutedText,
  customerPanelButtonHeight,
  customerPanelButtonText,
} from "../../_lib/deskerTokens";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  showLabel?: boolean;
  variant?: "default" | "detail";
  className?: string;
};

export function QuantityStepper({
  value,
  onChange,
  showLabel = true,
  variant = "default",
  className = "",
}: QuantityStepperProps) {
  const isDetail = variant === "detail";
  const boxClass = isDetail
    ? `flex ${customerPanelButtonHeight} w-full items-stretch border border-[#282828]`
    : `inline-flex ${customerPanelButtonHeight} items-center border border-[#282828]`;
  const controlClass = isDetail
    ? `flex flex-1 items-center justify-center ${customerPanelButtonText}`
    : `px-2 py-1 ${customerBadgeText} ${customerPanelButtonText}`;

  return (
    <section className={className}>
      {showLabel ? <p className={`mb-2 ${customerMutedText}`}>수량</p> : null}
      <div className={boxClass}>
        <button
          type="button"
          aria-label="수량 감소"
          onClick={() => onChange(Math.max(1, value - 1))}
          className={controlClass}
        >
          −
        </button>
        <span
          className={`flex min-w-[2.25rem] flex-1 items-center justify-center border-x border-[#282828] ${controlClass}`}
        >
          {value}
        </span>
        <button
          type="button"
          aria-label="수량 증가"
          onClick={() => onChange(value + 1)}
          className={controlClass}
        >
          +
        </button>
      </div>
    </section>
  );
}
