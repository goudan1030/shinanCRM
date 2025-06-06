'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { usePathname } from 'next/navigation';
import { ThreeColumnLayout } from '@/components/layout/three-column-layout';

interface TitleMap {
  [key: string]: string;
}

const titleMap: TitleMap = {
  '/dashboard': '仪表盘',
  '/members': '会员管理',
  '/orders': '订单管理',
  '/settings': '系统设置',
  '/settings/profile': '个人资料',
  '/settings/security': '安全设置',
  '/finance/income': '收入管理',
  '/finance/expense': '支出管理',
  '/finance/settlement': '结算管理',
  '/platform': '平台管理',
  '/platform/banner': 'Banner管理',
  '/platform/chatgroups': '群聊管理',
  '/platform/article': '文章管理',
  '/miniapp/config': '小程序配置',
  '/miniapp/review': '审核发布',
  '/wecom/config': '企业微信配置',
  '/wecom/sync': '数据同步',
  '/system': '缓存管理',
  '/system/cache': '缓存管理'
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageTitle = titleMap[pathname] || 'CRM系统';

  return (
    <ThreeColumnLayout 
      sidebarContent={<Sidebar />}
      className="bg-gray-50"
    >
      <header className="fixed top-0 right-0 h-[48px] bg-white border-b z-[90] transition-all duration-300 group-hover:left-[207px] left-[57px]">
        <div className="h-full flex items-center px-4">
          <h1 className="text-lg font-medium">{pageTitle}</h1>
        </div>
      </header>
      <div className="pt-[48px] h-screen overflow-hidden bg-white">
        <main className="h-full overflow-auto mx-auto relative z-[1]">
          <div>{children}</div>
        </main>
      </div>
    </ThreeColumnLayout>
  );
}