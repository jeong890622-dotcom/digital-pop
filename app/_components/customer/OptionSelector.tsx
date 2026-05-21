import type { ProductOption } from "../../_types/productDetail";
import {
  customerBadgeText,
  customerLightText,
  customerMutedText,
  customerOptionChip,
  customerOptionChipDisabled,
  customerOptionChipHover,
  customerOptionChipPadding,
  customerOptionChipSelected,
  customerPanelButtonHeight,
  customerPanelButtonText,
  customerPanelButtonTextOnDark,
  customerPanelSectionLabel,
  customerTextHover,
} from "../../_lib/deskerTokens";

type OptionSelectorProps = {
  label: string;
  options: ProductOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  variant?: "default" | "detail";
  columns?: 1 | 2;
  uppercaseLabel?: boolean;
  allowDeselect?: boolean;
};

export function OptionSelector({
  label,
  options,
  selectedId,
  onSelect,
  variant = "default",
  uppercaseLabel = false,
  allowDeselect = false,
}: OptionSelectorProps) {
  const displayLabel = uppercaseLabel ? label.toUpperCase() : label;

  if (variant === "detail") {
    return (
      <section>
        <p className={`mb-3 ${customerPanelSectionLabel}`}>{displayLabel}</p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const isSelected = option.id === selectedId;
            const isDisabled = option.disabled === true;
            return (
              <button
                key={option.id}
                type="button"
                disabled={isDisabled}
                aria-disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  if (allowDeselect && isSelected) {
                    onSelect(option.id);
                    return;
                  }
                  onSelect(option.id);
                }}
                className={`inline-flex ${customerPanelButtonHeight} items-center justify-center border ${customerOptionChipPadding} transition-colors ${
                  isDisabled
                    ? customerOptionChipDisabled
                    : isSelected
                      ? `${customerOptionChipSelected} ${customerPanelButtonTextOnDark}`
                      : `${customerOptionChip} ${customerPanelButtonText} ${customerOptionChipHover}`
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section>
      <p className={`mb-2 ${customerMutedText}`}>{displayLabel}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          const isDisabled = option.disabled === true;
          return (
            <button
              key={option.id}
              type="button"
              disabled={isDisabled}
              aria-disabled={isDisabled}
              onClick={() => {
                if (isDisabled) return;
                onSelect(option.id);
              }}
              className={`border px-3 py-1.5 transition-colors ${customerBadgeText} ${
                isDisabled
                  ? `cursor-not-allowed border-[#B3B3B3] ${customerLightText}`
                  : isSelected
                    ? "border-[#282828] text-[#282828]"
                    : `border-[#B3B3B3] ${customerMutedText} hover:border-[#282828] hover:text-[#FF5948]`
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
