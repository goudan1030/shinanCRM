'use client';

import { ThreeColumnLayout } from '@/components/layout/three-column-layout';
import { Sidebar } from '@/components/layout/sidebar';
import { MemberFilter } from '@/components/member/member-filter';  // 需要创建这个组件

export default function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThreeColumnLayout 
      sidebarContent={<Sidebar />}
      middleContent={<MemberFilter />}
      useThreeColumns={true}  // 启用三栏布局
      className="bg-gray-50"
    >
      {children}
    </ThreeColumnLayout>
  );
} 