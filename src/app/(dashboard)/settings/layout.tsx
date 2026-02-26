'use client';

import { ThreeColumnLayout } from '@/components/layout/three-column-layout';
import { Sidebar } from '@/components/layout/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const SettingsMenu = (
    <div className="h-full bg-white relative z-[998] hidden lg:block">
      <div className="flex h-[48px] items-center px-6 border-b">
        <h1 className="text-2xl font-semibold text-gray-900">系统设置</h1>
      </div>
      <div className="space-y-1 p-2">
        <Link
          href="/settings/profile"
          className={`flex items-center rounded-md py-2 px-3 ${
            pathname === '/settings/profile' ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'
          }`}
        >
          <span className="text-[13px]">个人资料</span>
        </Link>
        <Link
          href="/settings/security"
          className={`flex items-center rounded-md py-2 px-3 ${
            pathname === '/settings/security' ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'
          }`}
        >
          <span className="text-[13px]">安全设置</span>
        </Link>
        <Link
          href="/system/api-check"
          className={`flex items-center rounded-md py-2 px-3 ${
            pathname === '/system/api-check' ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'
          }`}
        >
          <span className="text-[13px]">API检查</span>
        </Link>
        <Link
          href="/system/google-sheets"
          className={`flex items-center rounded-md py-2 px-3 ${
            pathname === '/system/google-sheets' ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10 hover:text-primary'
          }`}
        >
          <span className="text-[13px]">谷歌表格同步</span>
        </Link>
      </div>
    </div>
  );

  return (
    <ThreeColumnLayout 
      sidebarContent={<Sidebar />}
      middleContent={SettingsMenu}
      useThreeColumns={true}
      useTwoColumnsOnMobile={true}
      className="bg-gray-50"
    >
      {children}
    </ThreeColumnLayout>
  );
} 