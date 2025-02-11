'use client';

import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Users, Settings, Wallet, ArrowDownCircle, ArrowUpCircle, Calculator, LogOut, Smartphone, Building2, User } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  { name: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
  { name: '会员管理', href: '/members', icon: Users },
  {
    name: '收支管理',
    href: '/finance',
    icon: Wallet,
    matchPaths: ['/finance', '/finance/income', '/finance/expense', '/finance/settlement'],
    children: [
      { name: '收入管理', href: '/finance/income', icon: ArrowDownCircle },
      { name: '支出管理', href: '/finance/expense', icon: ArrowUpCircle },
      { name: '结算管理', href: '/finance/settlement', icon: Calculator }
    ]
  },
  {
    name: '小程序管理',
    href: '/miniapp',
    icon: Smartphone,
    matchPaths: ['/miniapp', '/miniapp/config', '/miniapp/review'],
    children: [
      { name: '基本配置', href: '/miniapp/config' },
      { name: '审核管理', href: '/miniapp/review' }
    ]
  },
  {
    name: '企业微信管理',
    href: '/wecom',
    icon: Building2,
    matchPaths: ['/wecom', '/wecom/config'],
    children: [
      { name: '基本配置', href: '/wecom/config' }
    ]
  },
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
  const supabase = createClientComponentClient();


  const currentParentItem = navigation.find(item => 
    item.children?.some(child => child.href === pathname) || item.href === pathname
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

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
                  </div>
                </Link>
              </div>
            );
          })}
        </nav>
        <div className="px-2 h-[48px] flex items-center border-t">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full outline-none">
              <div className={cn(
                'flex items-center rounded-md',
                pathname === '/settings/profile' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-50'
              )}>
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
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>个人信息</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>退出登录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 独立的二级菜单区域 */}
      {currentParentItem?.children && (
        <div className="hidden md:block fixed left-[57px] top-0 h-[calc(100vh-0px)] w-[240px] bg-white border-r z-[5]">
          <div className="h-[48px] flex items-center px-4 border-b">
            <h2 className="text-2xl font-bold">{currentParentItem.name}</h2>
          </div>
          <div className="space-y-1 p-2">
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