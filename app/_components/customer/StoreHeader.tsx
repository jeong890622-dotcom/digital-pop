import { customerHeaderStoreLabel } from "../../_lib/formatStoreDisplayName";
import { customerContentPadding, customerMainNavLabel } from "../../_lib/deskerTokens";

type StoreHeaderProps = {
  storeName: string;
};

/** QR 오류 등 단순 헤더 */
export function StoreHeader({ storeName }: StoreHeaderProps) {
  const storeLabel = customerHeaderStoreLabel(storeName);

  return (
    <header className="sticky top-0 z-50 bg-white">
      <div
        className={`${customerContentPadding} flex h-10 items-center justify-between gap-4 sm:grid sm:grid-cols-[1fr_auto_1fr]`}
      >
        <p className={customerMainNavLabel}>DIGITAL POP</p>
        <div className="hidden justify-center sm:flex">
          {storeLabel ? <p className={customerMainNavLabel}>{storeLabel}</p> : null}
        </div>
        <span className="hidden sm:block" aria-hidden />
      </div>
    </header>
  );
}
