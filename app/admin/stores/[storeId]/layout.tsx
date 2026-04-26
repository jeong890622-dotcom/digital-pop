import { StoreDetailTabs } from "../../../_components/admin/StoreDetailTabs";

type StoreDetailLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
};

export default async function StoreDetailLayout({
  children,
  params,
}: StoreDetailLayoutProps) {
  const { storeId } = await params;

  return (
    <section>
      <p className="text-xs text-[#888888]">매장 상세</p>
      <h1 className="mt-1 text-lg font-semibold text-[#111111]">{storeId}</h1>
      <StoreDetailTabs storeId={storeId} />
      <div className="pt-5">{children}</div>
    </section>
  );
}
