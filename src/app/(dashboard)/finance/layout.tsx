'use client';

import { ThreeColumnLayout } from '@/components/layout/three-column-layout';
import { Sidebar } from '@/components/layout/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface FinanceLayoutProps {
  children: React.ReactNode;
}

export default function FinanceLayout({
  children,
}: FinanceLayoutProps) {
  const pathname = usePathname();

  return (
    <ThreeColumnLayout 
      sidebarContent={<Sidebar />}
      className="bg-gray-50"
    >
      <div className="flex h-screen overflow-hidden">
        {/* 左侧导航菜单 - 固定位置 */}
        <div className="fixed inset-y-0 left-[57px] w-[240px] bg-white border-r z-[900]">
          <div className="flex h-[48px] items-center px-6 border-b">
            <h1 className="text-2xl font-semibold text-gray-900">收支管理</h1>
          </div>
          <div className="space-y-1 p-2">
            <Link
              href="/finance/income"
              className={`flex items-center rounded-md py-2 px-3 ${
                pathname === '/finance/income' ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <span className="text-[13px]">收入管理</span>
            </Link>
            <Link
              href="/finance/expense"
              className={`flex items-center rounded-md py-2 px-3 ${
                pathname === '/finance/expense' ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <span className="text-[13px]">支出管理</span>
            </Link>
            <Link
              href="/finance/settlement"
              className={`flex items-center rounded-md py-2 px-3 ${
                pathname === '/finance/settlement' ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <span className="text-[13px]">结算管理</span>
            </Link>
          </div>
        </div>

        {/* 主内容区域 - 添加了左边距以避开导航 */}
        <div className="w-full">
          {children}
        </div>
      </div>
    </ThreeColumnLayout>
  );
} 