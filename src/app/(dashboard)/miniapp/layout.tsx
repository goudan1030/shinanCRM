'use client';

import { ThreeColumnLayout } from '@/components/layout/three-column-layout';
import { Sidebar } from '@/components/layout/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MiniappLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const MiniappMenu = (
    <div className="h-full bg-white relative z-[998]">
      <div className="flex h-[48px] items-center px-6 border-b">
        <h1 className="text-2xl font-semibold text-gray-900">小程序管理</h1>
      </div>
      <div className="space-y-1 p-2">
        <Link
          href="/miniapp/config"
          className={`flex items-center rounded-md py-2 px-3 ${
            pathname === '/miniapp/config' ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'
          }`}
        >
          <span className="text-[13px]">基础配置</span>
        </Link>
        <Link
          href="/miniapp/review"
          className={`flex items-center rounded-md py-2 px-3 ${
            pathname === '/miniapp/review' ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'
          }`}
        >
          <span className="text-[13px]">审核发布</span>
        </Link>
      </div>
    </div>
  );

  return (
    <ThreeColumnLayout 
      sidebarContent={<Sidebar />}
      middleContent={MiniappMenu}
      useThreeColumns={true}
      className="bg-gray-50"
    >
      {children}
    </ThreeColumnLayout>
  );
} 