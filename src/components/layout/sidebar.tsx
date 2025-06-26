'use client';

import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Users, Settings, Wallet, ArrowDownCircle, ArrowUpCircle, Calculator, LogOut, Smartphone, Building2, User, UserCircle, Megaphone, AppWindow, Database } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/ui/use-toast';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { LucideIcon } from 'lucide-react';
import React from 'react';

// 为子菜单项创建单独的类型
interface NavigationChildItem {
  name: string;
  href: string;
  icon?: LucideIcon;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  matchPaths?: string[];
  children?: NavigationChildItem[];
}

// 为 props 添加类型定义
interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
  onMenuClick?: () => void;
}

const navigation: NavigationItem[] = [
  { name: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
  { name: '会员管理', href: '/members', icon: Users },
  { name: '用户管理', href: '/users', icon: User },
  {
    name: '收支管理',
    href: '/finance/income',
    icon: Wallet,
    matchPaths: ['/finance', '/finance/income', '/finance/expense', '/finance/settlement'],
    children: [
      { name: '收入管理', href: '/finance/income', icon: ArrowDownCircle },
      { name: '支出管理', href: '/finance/expense', icon: ArrowUpCircle },
      { name: '结算管理', href: '/finance/settlement', icon: Calculator }
    ]
  },
  {
    name: '平台管理',
    href: '/platform/banner',
    icon: Megaphone,
    matchPaths: ['/platform', '/platform/banner', '/platform/chatgroups', '/platform/article'],
    children: [
      { name: 'Banner管理', href: '/platform/banner' },
      { name: '群聊管理', href: '/platform/chatgroups' },
      { name: '文章管理', href: '/platform/article' }
    ]
  },
  {
    name: '小程序管理',
    href: '/miniapp/config',
    icon: Smartphone,
    matchPaths: ['/miniapp', '/miniapp/config', '/miniapp/review'],
    children: [
      { name: '基础配置', href: '/miniapp/config' },
      { name: '审核发布', href: '/miniapp/review' }
    ]
  },
  {
    name: '企业微信管理',
    href: '/wecom/config',
    icon: Building2,
    matchPaths: ['/wecom', '/wecom/config', '/wecom/sync'],
    children: [
      { name: '基础配置', href: '/wecom/config' },
      { name: '数据同步', href: '/wecom/sync' }
    ]
  },
  {
    name: '系统设置',
    href: '/settings/profile',
    icon: Settings,
    matchPaths: ['/settings', '/settings/profile', '/settings/security'],
    children: [
      { name: '个人资料', href: '/settings/profile' },
      { name: '安全设置', href: '/settings/security' }
    ]
  },
];

const menuRedirectMap = {
  '/finance': '/finance/income', // 收支管理 -> 收入管理
  '/platform': '/platform/banner', // 平台管理 -> Banner管理
  '/miniapp': '/miniapp/config', // 小程序管理 -> 基础配置
  '/wecom': '/wecom/config', // 企业微信 -> 基础配置
  '/settings': '/settings/profile', // 系统设置 -> 个人资料
  '/system': '/system/cache', // 缓存管理 -> 缓存管理
};

export function Sidebar({ className, onMenuClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('退出登录失败');
      }
      
      // 等待响应成功后再重定向
      await response.json();
      router.push('/login');
      router.refresh(); // 刷新路由以确保状态更新
    } catch (error) {
      console.error('退出登录失败:', error);
      toast({
        variant: 'destructive',
        title: '退出失败',
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    }
  };

  const handleMenuClick = (href: string) => {
    // 记录当前时间，用于调试性能问题
    const startTime = performance.now();
    
    // 如果是需要重定向的路径，则重定向到对应的子页面
    const targetPath = href in menuRedirectMap ? 
      menuRedirectMap[href as keyof typeof menuRedirectMap] : 
      href;
      
    // 立即触发路由预载
    router.prefetch(targetPath);
    
    // 在移动端点击菜单后关闭菜单
    if (onMenuClick) {
      onMenuClick();
    }
    
    // 延迟很小的时间，让UI先做出响应，减轻卡顿感
    setTimeout(() => {
      router.push(targetPath);
      
      // 记录导航耗时（仅供调试）
      const endTime = performance.now();
      console.log(`菜单导航耗时: ${endTime - startTime}ms`, targetPath);
    }, 10);
  };

  const menus = [
    {
      href: '/dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: '仪表盘'
    },
    {
      href: '/members',
      icon: <Users className="h-4 w-4" />,
      label: '会员管理'
    },
    {
      href: '/users',
      icon: <User className="h-4 w-4" />,
      label: '用户管理'
    },
    {
      href: '/finance',
      icon: <Wallet className="h-4 w-4" />,
      label: '收支管理'
    },
    {
      href: '/platform',
      icon: <Megaphone className="h-4 w-4" />,
      label: '平台管理'
    },
    {
      href: '/miniapp',
      icon: <AppWindow className="h-4 w-4" />,
      label: '小程序管理'
    },
    {
      href: '/wecom',
      icon: <Building2 className="h-4 w-4" />,
      label: '企业微信'
    },
    {
      href: '/settings',
      icon: <Settings className="h-4 w-4" />,
      label: '系统设置'
    },
    {
      href: '/system',
      icon: <Database className="h-4 w-4" />,
      label: '缓存管理'
    }
  ];

  return (
    <div className={cn('h-full', className)}>
      {/* 桌面端侧边栏 */}
      <div className="hidden md:flex h-full w-[57px] hover:w-[207px] flex-col bg-white border-r transition-all duration-300 overflow-hidden group/sidebar relative z-[1001]">
        <div className="h-[48px] flex items-center border-b">
          <div className="w-[57px] flex items-center justify-center flex-shrink-0">
            <Image
              src="/logo.svg"
              alt="Logo"
              width={24}
              height={24}
              className="rounded-md"
              priority
              unoptimized
            />
          </div>
          <div className="w-0 group-hover/sidebar:w-auto overflow-hidden transition-all duration-300">
            <p className="whitespace-nowrap text-[13px] font-medium truncate">
              CRM系统
            </p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
          {menus.map((menu) => (
            <div key={menu.href}>
              <div
                onClick={() => handleMenuClick(menu.href)}
                className={cn(
                  'flex items-center rounded-md cursor-pointer',
                  pathname.startsWith(menu.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <div className="w-[40px] h-[40px] flex items-center justify-center flex-shrink-0">
                  {menu.icon}
                </div>
                <div className="w-0 group-hover/sidebar:w-auto overflow-hidden transition-all duration-300">
                  <p className="whitespace-nowrap group-hover/sidebar:ml-2 text-[13px] font-medium truncate">
                    {menu.label}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="px-2 h-[48px] mt-auto flex items-center border-t">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full outline-none">
              <div className={cn(
                'flex items-center rounded-md',
                pathname === '/settings/profile' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-50'
              )}>
                <div className="w-[40px] h-[40px] flex items-center justify-center flex-shrink-0">
                  <UserCircle className="h-4 w-4 text-gray-500" />
                </div>
                <div className="w-0 group-hover/sidebar:w-auto overflow-hidden transition-all duration-300">
                  <p className="whitespace-nowrap group-hover/sidebar:ml-2 text-[13px] font-medium truncate">
                    {session?.user?.email || '用户'}
                  </p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] z-[1002]">
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

      {/* 移动端侧边栏 */}
      <div className="md:hidden flex flex-col h-full">
        <nav className="flex-1 py-4 space-y-2">
          {menus.map((menu) => (
            <div key={menu.href}>
              <div
                onClick={() => handleMenuClick(menu.href)}
                className={cn(
                  'flex items-center px-4 py-3 text-sm font-medium rounded-lg mx-2 cursor-pointer transition-colors',
                  pathname.startsWith(menu.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <div className="mr-3 flex-shrink-0">
                  {menu.icon}
                </div>
                <span>{menu.label}</span>
              </div>
            </div>
          ))}
        </nav>

        {/* 移动端用户信息和退出 */}
        <div className="border-t p-4 space-y-2">
          <div 
            onClick={() => {
              if (onMenuClick) onMenuClick();
              router.push('/settings/profile');
            }}
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg cursor-pointer text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <UserCircle className="mr-3 h-4 w-4 flex-shrink-0" />
            <span>{session?.user?.email || '个人信息'}</span>
          </div>
          <div 
            onClick={() => {
              if (onMenuClick) onMenuClick();
              handleLogout();
            }}
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg cursor-pointer text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4 flex-shrink-0" />
            <span>退出登录</span>
          </div>
        </div>
      </div>
    </div>
  );
}