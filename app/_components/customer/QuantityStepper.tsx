type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  showLabel?: boolean;
};

export function QuantityStepper({
  value,
  onChange,
  showLabel = true,
}: QuantityStepperProps) {
  return (
    <section>
      {showLabel ? (
        <p className="mb-2 text-xs text-[#666666]">수량</p>
      ) : null}
      <div className="inline-flex items-center border border-[#E5E5E5]">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          className={`text-[#666666] ${showLabel ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs"}`}
          aria-label="수량 감소"
        >
          -
        </button>
        <span
          className={`text-center text-[#111111] ${showLabel ? "min-w-10 px-3 py-1.5 text-sm" : "min-w-8 px-2 py-1 text-xs"}`}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className={`text-[#666666] ${showLabel ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs"}`}
          aria-label="수량 증가"
        >
          +
        </button>
      </div>
    </section>
  );
}
