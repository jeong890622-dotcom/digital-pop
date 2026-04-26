import type { ProductOption } from "../../_types/productDetail";

type OptionSelectorProps = {
  label: string;
  options: ProductOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function OptionSelector({
  label,
  options,
  selectedId,
  onSelect,
}: OptionSelectorProps) {
  return (
    <section>
      <p className="mb-2 text-xs text-[#666666]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`rounded-sm border px-3 py-1.5 text-xs ${
                isSelected
                  ? "border-[#111111] text-[#111111]"
                  : "border-[#E5E5E5] text-[#666666]"
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
