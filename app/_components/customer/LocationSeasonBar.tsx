import type { ReactNode } from "react";
import { customerBodyMedium, customerContentPadding } from "../../_lib/deskerTokens";

type LocationSeasonBarProps = {
  zoneLabel: string;
  zoneFilterSlot: ReactNode;
};

export function LocationSeasonBar({ zoneLabel, zoneFilterSlot }: LocationSeasonBarProps) {
  return (
    <div className={`${customerContentPadding} flex h-10 items-center justify-between bg-[#B3B3B3]`}>
      <p className={`${customerBodyMedium} uppercase`}>{zoneLabel}</p>
      {zoneFilterSlot}
    </div>
  );
}
