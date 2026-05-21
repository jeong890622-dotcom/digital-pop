"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Zone } from "../../_data/mockProducts";
import {
  customerBodyText,
  customerLightText,
  customerMainNavLabel,
  customerTextHover,
} from "../../_lib/deskerTokens";

export const ALL_ZONE_VALUE = "all";

type ZoneFilterSelectProps = {
  zones: Zone[];
  selectedZoneId: string;
  onSelect: (zoneId: string) => void;
  qrZoneId?: string | null;
  hasManualZoneOverride?: boolean;
  onReturnToQrZone?: () => void;
  variant?: "default" | "dark";
};

export function ZoneFilterSelect({
  zones,
  selectedZoneId,
  onSelect,
  qrZoneId,
  hasManualZoneOverride = false,
  onReturnToQrZone,
  variant = "default",
}: ZoneFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(() => {
    if (selectedZoneId === ALL_ZONE_VALUE) return "ALL";
    return zones.find((z) => z.id === selectedZoneId)?.name.toUpperCase() ?? "ALL";
  }, [selectedZoneId, zones]);

  const qrZoneName = useMemo(() => {
    if (!qrZoneId || qrZoneId === ALL_ZONE_VALUE) return "";
    return zones.find((z) => z.id === qrZoneId)?.name ?? "";
  }, [qrZoneId, zones]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const triggerClass = `${customerMainNavLabel} hover:underline`;

  const menuWidth =
    variant === "dark"
      ? "w-max min-w-[14rem]"
      : "w-[calc(100vw-3.5rem)] sm:w-max sm:min-w-[14rem]";

  const menuItemClass = (isMuted: boolean) =>
    `flex h-10 w-full items-center px-4 text-left transition-colors ${
      isMuted ? customerLightText : `${customerBodyText} ${customerTextHover}`
    }`;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 ${triggerClass}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>ZONE {selectedLabel}</span>
        <span className="text-[0.7em] leading-none opacity-80">{open ? "↑" : "↓"}</span>
      </button>

      {open ? (
        <div
          role="listbox"
          className={`absolute right-0 top-full z-50 mt-1 border border-[#282828] bg-white ${menuWidth}`}
        >
          {hasManualZoneOverride && qrZoneName && onReturnToQrZone ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onReturnToQrZone();
                  setOpen(false);
                }}
                className={`flex h-10 w-full items-center bg-white px-4 text-left ${customerBodyText} ${customerTextHover}`}
              >
                Return to Zone <span className="font-medium">{qrZoneName}</span>
              </button>
              <div className="border-b border-[#282828]" />
            </>
          ) : null}
          <button
            type="button"
            onClick={() => {
              onSelect(ALL_ZONE_VALUE);
              setOpen(false);
            }}
            className={menuItemClass(selectedZoneId === ALL_ZONE_VALUE)}
          >
            ALL
          </button>
          {zones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => {
                onSelect(zone.id);
                setOpen(false);
              }}
              className={menuItemClass(selectedZoneId === zone.id)}
            >
              {zone.name.toUpperCase()}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
