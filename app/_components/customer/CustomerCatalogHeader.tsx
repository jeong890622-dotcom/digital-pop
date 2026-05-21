"use client";

import { useEffect, useState } from "react";
import { customerHeaderStoreLabel } from "../../_lib/formatStoreDisplayName";
import {
  customerContentPadding,
  customerMainNavLabel,
} from "../../_lib/deskerTokens";

type CustomerCatalogHeaderProps = {
  storeName: string;
  cartQuantity: number;
  onOpenCart: () => void;
};

function KstClock() {
  const [timeLabel, setTimeLabel] = useState("");

  useEffect(() => {
    const formatKst = () => {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(new Date());
      const pick = (type: string) =>
        parts.find((p) => p.type === type)?.value ?? "00";
      setTimeLabel(`${pick("hour")}:${pick("minute")}:${pick("second")}`);
    };
    formatKst();
    const timerId = window.setInterval(formatKst, 1000);
    return () => window.clearInterval(timerId);
  }, []);

  return (
    <p className={`${customerMainNavLabel} tabular-nums`}>
      KST {timeLabel || "--:--:--"}
    </p>
  );
}

export function CustomerCatalogHeader({
  storeName,
  cartQuantity,
  onOpenCart,
}: CustomerCatalogHeaderProps) {
  const storeLabel = customerHeaderStoreLabel(storeName);
  const showCartMobile = cartQuantity > 0;

  return (
    <header className="sticky top-0 z-50 bg-white">
      <div
        className={`${customerContentPadding} flex h-10 items-center justify-between gap-4 sm:grid sm:grid-cols-[1fr_auto_1fr]`}
      >
        <p className={`${customerMainNavLabel} shrink-0`}>DIGITAL POP</p>

        <div className="hidden min-w-0 justify-center sm:flex">
          {storeLabel ? (
            <p className={`${customerMainNavLabel} truncate`}>{storeLabel}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-4 sm:gap-5">
          <button
            type="button"
            onClick={onOpenCart}
            className={`${customerMainNavLabel} hover:underline ${showCartMobile ? "" : "hidden sm:inline"}`}
          >
            CART {cartQuantity}
          </button>
          <div className="hidden lg:block">
            <KstClock />
          </div>
        </div>
      </div>
    </header>
  );
}
