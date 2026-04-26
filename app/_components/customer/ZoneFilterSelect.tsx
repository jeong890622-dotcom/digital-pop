import type { Zone } from "../../_data/mockProducts";

export const ALL_ZONE_VALUE = "all";

type ZoneFilterSelectProps = {
  zones: Zone[];
  selectedZoneId: string;
  onSelect: (zoneId: string) => void;
};

export function ZoneFilterSelect({
  zones,
  selectedZoneId,
  onSelect,
}: ZoneFilterSelectProps) {
  return (
    <label className="flex items-center gap-2 text-xs text-[#666666]">
      <span className="shrink-0">ZONE</span>
      <select
        value={selectedZoneId}
        onChange={(event) => onSelect(event.target.value)}
        className="min-w-28 border-b border-[#111111] bg-transparent py-1 text-sm text-[#111111] outline-none"
      >
        <option value={ALL_ZONE_VALUE}>전체</option>
        {zones.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.name.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
