type StoreHeaderProps = {
  storeName: string;
};

export function StoreHeader({ storeName }: StoreHeaderProps) {
  return (
    <header className="border-b border-[#E5E5E5] bg-white px-4 py-4 sm:px-6 lg:px-10">
      <p className="text-xs text-[#888888]">디지털 가격 POP</p>
      <h1 className="mt-1 text-lg font-semibold text-[#111111]">{storeName}</h1>
    </header>
  );
}
