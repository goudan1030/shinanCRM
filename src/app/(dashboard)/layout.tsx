'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { usePathname } from 'next/navigation';

const titleMap = {
  '/dashboard': '仪表盘',
  '/members': '会员管理',
  '/orders': '订单管理',
  '/settings': '系统设置',
  '/settings/profile': '个人信息'
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageTitle = titleMap[pathname] || 'CRM系统';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 right-0 h-[48px] bg-white border-b z-[5] transition-all duration-300 group-hover:left-[207px] left-[57px]">
        <div className="h-full flex items-center px-4">
          <h1 className="text-lg font-medium">{pageTitle}</h1>
        </div>
      </header>
      <Sidebar />
      <div className="md:pl-[57px] pt-[48px] h-screen overflow-hidden bg-white">
        <main className="h-full overflow-auto max-w-[1200px] mx-auto">
          <div>{children}</div>
        </main>
      </div>
    </div>
  );
}