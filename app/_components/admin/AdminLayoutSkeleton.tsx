export function AdminLayoutSkeleton() {
  return (
    <div className="flex min-h-screen animate-pulse bg-[#F5F5F5]">
      <div className="w-52 border-r border-[#E5E5E5] bg-white" />
      <div className="flex flex-1 flex-col">
        <div className="h-14 border-b border-[#E5E5E5] bg-white" />
        <div className="flex-1 border-l border-[#E5E5E5] bg-white p-6">
          <div className="h-6 w-40 rounded-sm bg-[#E5E5E5]" />
          <div className="mt-4 h-24 max-w-xl rounded-sm bg-[#F5F5F5]" />
        </div>
      </div>
    </div>
  );
}
