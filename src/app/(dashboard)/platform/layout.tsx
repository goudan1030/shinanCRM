'use client';

import { ThreeColumnLayout } from '@/components/layout/three-column-layout';
import { Sidebar } from '@/components/layout/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const PlatformMenu = (
    <div className="h-full bg-white relative z-[998]">
      <div className="flex h-[48px] items-center px-6 border-b">
        <h1 className="text-2xl font-semibold text-gray-900">平台管理</h1>
      </div>
      <div className="space-y-1 p-2">
        <Link
          href="/platform"
          className={`flex items-center rounded-md py-2 px-3 ${
            pathname === '/platform' ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'
          }`}
        >
          <span className="text-[13px]">平台活动</span>
        </Link>
        <Link
          href="/platform/banner"
          className={`flex items-center rounded-md py-2 px-3 ${
            pathname === '/platform/banner' ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'
          }`}
        >
          <span className="text-[13px]">Banner管理</span>
        </Link>
        <Link
          href="/platform/news"
          className={`flex items-center rounded-md py-2 px-3 ${
            pathname === '/platform/news' ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'
          }`}
        >
          <span className="text-[13px]">资讯管理</span>
        </Link>
      </div>
    </div>
  );

  return (
    <ThreeColumnLayout 
      sidebarContent={<Sidebar />}
      middleContent={PlatformMenu}
      useThreeColumns={true}
      className="bg-gray-50"
    >
      {children}
    </ThreeColumnLayout>
  );
} 