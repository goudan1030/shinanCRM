'use client';

import { ThreeColumnLayout } from '@/components/layout/three-column-layout';
import { Sidebar } from '@/components/layout/sidebar';
import { MemberFilter } from '@/components/member/member-filter';

export default function MembersLayout({
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