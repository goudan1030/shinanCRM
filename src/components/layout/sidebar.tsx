'use client';

import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Users, FileText, Settings, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';

const navigation = [
  { name: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
  { name: '会员管理', href: '/members', icon: Users },
  { name: '订单管理', href: '/orders', icon: FileText },
  {
    name: '系统设置',
    href: '/settings',
    icon: Settings,
    matchPaths: ['/settings', '/settings/profile'],
    children: [
      { name: '个人信息', href: '/settings/profile' }
    ]
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();
  const [activeParent, setActiveParent] = useState<string | null>(null);

  useEffect(() => {
    // 根据当前路径设置活动的父菜单
    const parentItem = navigation.find(item => 
      item.children?.some(child => child.href === pathname) || item.href === pathname
    );
    setActiveParent(parentItem?.href || null);
  }, [pathname]);

  const currentParentItem = navigation.find(item => 
    item.children?.some(child => child.href === pathname) || item.href === pathname
  );

  return (
    <>
      <div className="hidden md:flex h-full w-[57px] hover:w-[207px] flex-col fixed left-0 top-0 bottom-0 bg-white border-r transition-all duration-300 overflow-hidden group z-20">
        <div className="flex h-[48px] items-center px-4 border-b">
          <Image src="/logo.svg" alt="Logo" width={32} height={32} />
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const isActive = item.matchPaths ? item.matchPaths.includes(pathname) : pathname === item.href;
            const hasChildren = item.children && item.children.length > 0;
            const isChildActive = hasChildren && item.children.some(child => child.href === pathname);

            return (
              <div key={item.name}>
                <Link
                  href={hasChildren ? item.children[0].href : item.href}
                  className={cn(
                    'flex items-center rounded-md group-hover:w-full',
                    (isActive || isChildActive)
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <div className="w-[40px] h-[40px] flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="w-0 group-hover:w-auto overflow-hidden transition-all duration-300 flex items-center justify-between flex-1">
                    <span className="whitespace-nowrap group-hover:ml-2 text-[13px]">{item.name}</span>
                    {hasChildren && (
                      <ChevronDown className="h-4 w-4 opacity-50 mr-2" />
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </nav>
        <div className="px-2 h-[48px] flex items-center border-t">
          <Link
            href="/settings/profile"
            className={cn(
              'flex items-center rounded-md',
              pathname === '/settings/profile' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-50'
            )}
          >
            <div className="w-[40px] h-[40px] flex items-center justify-center flex-shrink-0">
              {session?.user?.user_metadata?.avatar_url ? (
                <Image
                  src={session.user.user_metadata.avatar_url}
                  alt="Avatar"
                  width={16}
                  height={16}
                  className="rounded-full"
                />
              ) : (
                <User className="h-4 w-4 text-gray-500" />
              )}
            </div>
            <div className="w-0 group-hover:w-auto overflow-hidden transition-all duration-300">
              <p className="whitespace-nowrap group-hover:ml-2 text-[13px] font-medium truncate">
                {session?.user?.user_metadata?.name || session?.user?.email}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* 独立的二级菜单区域 */}
      {currentParentItem?.children && (
        <div className="hidden md:block fixed left-[57px] top-0 h-[calc(100vh-0px)] w-[240px] bg-white border-r z-[5]">
          <div className="space-y-1 p-2 mt-[48px]">
            {currentParentItem.children.map((child) => (
              <Link
                key={child.name}
                href={child.href}
                className={cn(
                  'flex items-center rounded-md py-2 px-3',
                  pathname === child.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <span className="text-[13px]">{child.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}