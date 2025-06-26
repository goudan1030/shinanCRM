'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { usePathname } from 'next/navigation';
import { ThreeColumnLayout } from '@/components/layout/three-column-layout';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 处理移动端菜单打开时的body滚动锁定和ESC键关闭
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      
      // ESC键关闭菜单
      const handleEscKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setMobileMenuOpen(false);
        }
      };
      
      document.addEventListener('keydown', handleEscKey);
      
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscKey);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  return (
    <ThreeColumnLayout 
      sidebarContent={<Sidebar />}
      className="bg-gray-50"
    >
      {/* 顶部标题栏 - 移动端全宽，桌面端留侧边栏空间 */}
      <header className="fixed top-0 right-0 h-[48px] bg-white border-b z-[90] transition-all duration-300 left-0 md:left-[57px]">
        <div className="h-full flex items-center justify-between px-3 sm:px-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg shadow-sm">
              <img 
                src="/logo.svg" 
                alt="Logo" 
                className="h-6 w-6"
              />
            </div>
            <h1 className="text-base sm:text-lg font-medium text-gray-800">{pageTitle}</h1>
          </div>
          
          {/* 移动端菜单按钮 */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label={mobileMenuOpen ? "关闭菜单" : "打开菜单"}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-gray-600" />
            ) : (
              <Menu className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>
      </header>

      {/* 移动端侧边栏遮罩层 */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[95] md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 移动端侧边栏 */}
      <div className={`
        fixed top-0 right-0 h-full w-[280px] bg-white shadow-xl z-[96] md:hidden
        transform transition-transform duration-300 ease-in-out border-l
        ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
              <Menu className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">导航菜单</h2>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="关闭菜单"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-72px)]">
          <Sidebar onMenuClick={() => setMobileMenuOpen(false)} />
        </div>
      </div>
      
      {/* 主内容区域 */}
      <div className="pt-[48px] min-h-screen bg-white">
        <main className="w-full relative z-[1]">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </ThreeColumnLayout>
  );
}