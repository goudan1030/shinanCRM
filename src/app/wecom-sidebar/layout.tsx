import { Suspense } from 'react';
import NavTabs from './_components/NavTabs';
import WecomClientShell from './_components/WecomClientShell';

export default function WecomSidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-sm">
      <Suspense fallback={<div className="h-[52px] bg-white border-b border-gray-200" />}>
        <NavTabs />
      </Suspense>
      {/* WecomClientShell: 初始化 SDK（仅一次），SDK 就绪前显示 loading，就绪后渲染子页面 */}
      <WecomClientShell>{children}</WecomClientShell>
    </div>
  );
}
