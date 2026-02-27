import { Suspense } from 'react';
import NavTabs from './_components/NavTabs';

export default function WecomSidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-sm">
      <Suspense fallback={<div className="h-[52px] bg-white border-b border-gray-200" />}>
        <NavTabs />
      </Suspense>
      <main className="flex-1 p-3">{children}</main>
    </div>
  );
}
