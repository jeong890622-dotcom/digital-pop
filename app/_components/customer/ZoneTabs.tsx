import type { Zone } from "../../_data/mockProducts";

type ZoneTabsProps = {
  zones: Zone[];
  selectedZoneId: string;
  onSelect: (zoneId: string) => void;
};

export function ZoneTabs({ zones, selectedZoneId, onSelect }: ZoneTabsProps) {
  return (
    <div className="mt-3 border-b border-[#E5E5E5]">
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-4">
        {zones.map((zone) => {
          const selected = zone.id === selectedZoneId;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => onSelect(zone.id)}
              className={`border-b-2 pb-2 text-sm transition-colors ${
                selected
                  ? "border-[#111111] font-semibold text-[#111111]"
                  : "border-transparent text-[#666666]"
              }`}
            >
              {zone.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
