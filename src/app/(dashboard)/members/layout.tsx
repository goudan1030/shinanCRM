'use client';

import { Suspense } from 'react';
import { ThreeColumnLayout } from '@/components/layout/three-column-layout';
import { Sidebar } from '@/components/layout/sidebar';
import { MemberFilter } from '@/components/member/member-filter';

function MembersLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThreeColumnLayout 
      sidebarContent={<Sidebar />}
      middleContent={<MemberFilter />}
      useThreeColumns={true}
      className="bg-gray-50"
    >
      {children}
    </ThreeColumnLayout>
  );
}

export default function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    }>
      <MembersLayoutContent>{children}</MembersLayoutContent>
    </Suspense>
  );
} 