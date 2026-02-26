'use client';

import { ThreeColumnLayout } from '@/components/layout/three-column-layout';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThreeColumnLayout 
      sidebarContent={<Sidebar />}
      useThreeColumns={false}  // 设置为 false，使用两栏布局
      className="bg-gray-50"
    >
      {children}
    </ThreeColumnLayout>
  );
} 