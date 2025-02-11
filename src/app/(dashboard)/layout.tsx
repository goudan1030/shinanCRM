'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Metadata } from 'next';
import { usePathname } from 'next/navigation';
import ThreeColumnLayout from '@/components/layouts/three-column-layout';

export const metadata: Metadata = {
  title: 'CRM系统',
  description: '客户关系管理系统',
};

interface TitleMap {
  [key: string]: string;  // 添加索引签名
}

const titleMap: TitleMap = {
  '/dashboard': '仪表盘',
  '/members': '会员管理',
  '/orders': '订单管理',
  '/settings': '系统设置',
  '/settings/profile': '个人资料',
  '/finance/income': '收入管理',
  '/finance/expense': '支出管理',
  '/finance/settlement': '结算管理'
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageTitle = titleMap[pathname] || 'CRM系统';

  return (
    <ThreeColumnLayout pageTitle={pageTitle}>
      <header className="fixed top-0 right-0 h-[48px] bg-white border-b z-[5] transition-all duration-300 group-hover:left-[207px] left-[57px]">
        <div className="h-full flex items-center px-4">
          <h1 className="text-lg font-medium">{pageTitle}</h1>
        </div>
      </header>
      <div className="pt-[48px] h-screen overflow-hidden bg-white">
        <main className="h-full overflow-auto mx-auto">
          <div>{children}</div>
        </main>
      </div>
    </ThreeColumnLayout>
  );
}