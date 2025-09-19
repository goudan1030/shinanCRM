'use client';

import { ThreeColumnLayout } from '@/components/layout/three-column-layout';
import { Sidebar } from '@/components/layout/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ContractLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <ThreeColumnLayout 
      sidebarContent={<Sidebar />}
      className="bg-gray-50"
    >
      <div className="flex h-screen overflow-hidden">
        {/* 左侧导航菜单 - 固定位置，移动端隐藏 */}
        <div className="hidden lg:block fixed inset-y-0 left-[57px] w-[240px] bg-white border-r z-[900]">
          <div className="flex h-[48px] items-center px-6 border-b">
            <h1 className="text-2xl font-semibold text-gray-900">合同管理</h1>
          </div>
          <div className="space-y-1 p-2">
            <Link
              href="/contracts/list"
              className={`flex items-center rounded-md py-2 px-3 ${
                pathname === '/contracts/list' ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <span className="text-[13px]">合同列表</span>
            </Link>
            <Link
              href="/contracts/sign"
              className={`flex items-center rounded-md py-2 px-3 ${
                pathname === '/contracts/sign' ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <span className="text-[13px]">签署管理</span>
            </Link>
          </div>
        </div>

        {/* 主内容区域 - 修复PC端宽度计算问题 */}
        <div className="w-full lg:w-[calc(100%-240px)] lg:ml-[240px] overflow-hidden">
          {children}
        </div>
      </div>
    </ThreeColumnLayout>
  );
}
