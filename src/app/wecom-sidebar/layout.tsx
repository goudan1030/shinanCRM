export default function WecomSidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 text-sm leading-relaxed">
      <h2 className="mb-3 text-base font-semibold">企业微信侧边栏</h2>
      {children}
    </div>
  );
}
