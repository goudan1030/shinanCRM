'use client';

import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Users, Settings, Wallet, ArrowDownCircle, ArrowUpCircle, Calculator, LogOut, Smartphone, Building2, User, UserCircle, Megaphone, AppWindow, Database, Menu, X } from 'lucide-react';
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
  isMobile?: boolean;
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
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
  '/finance': '/finance/income',
  '/platform': '/platform/banner',
  '/miniapp': '/miniapp/config',
  '/wecom': '/wecom/config',
  '/settings': '/settings/profile',
  '/system': '/system/cache',
};

export function Sidebar({ className, isMobile, sidebarOpen, setSidebarOpen }: SidebarProps) {
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
      
      await response.json();
      router.push('/login');
      router.refresh();
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
    const startTime = performance.now();
    
    const targetPath = href in menuRedirectMap ? 
      menuRedirectMap[href as keyof typeof menuRedirectMap] : 
      href;
      
    router.prefetch(targetPath);
    
    setTimeout(() => {
      router.push(targetPath);
      
      // 移动端点击菜单后关闭侧边栏
      if (isMobile && setSidebarOpen) {
        setSidebarOpen(false);
      }
      
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
    }
  ];

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
      // 移动端：全宽侧边栏
      isMobile ? "w-64" : "w-14 hover:w-52 group",
      className
    )}>
      {/* 顶部logo区域 */}
      <div className={cn(
        "flex items-center border-b border-gray-200",
        isMobile ? "h-16 px-4 justify-between" : "h-14 px-2 justify-center group-hover:justify-start group-hover:px-4"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-semibold text-sm">SN</span>
          </div>
          <span className={cn(
            "font-semibold text-gray-900 transition-all duration-300",
            isMobile ? "block" : "opacity-0 group-hover:opacity-100 whitespace-nowrap"
          )}>
            新星CRM
          </span>
        </div>
        
        {/* 移动端关闭按钮 */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen?.(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* 导航菜单 */}
      <div className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {menus.map((menu) => {
            const isActive = pathname === menu.href || pathname.startsWith(menu.href + '/');
            
            return (
              <button
                key={menu.href}
                onClick={() => handleMenuClick(menu.href)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg transition-all duration-200",
                  isMobile ? "px-3 py-3" : "px-3 py-2 group-hover:px-3",
                  isActive 
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <div className={cn(
                  "flex-shrink-0",
                  isActive ? "text-blue-600" : "text-gray-400"
                )}>
                  {menu.icon}
                </div>
                <span className={cn(
                  "font-medium transition-all duration-300 whitespace-nowrap",
                  isMobile ? "block" : "opacity-0 group-hover:opacity-100"
                )}>
                  {menu.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 底部用户信息 */}
      <div className={cn(
        "border-t border-gray-200 p-2",
        isMobile ? "block" : "group-hover:block"
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "w-full flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 transition-colors",
              isMobile ? "justify-start" : "justify-center group-hover:justify-start"
            )}>
              <UserCircle className="h-6 w-6 text-gray-500 flex-shrink-0" />
              <span className={cn(
                "font-medium text-gray-700 transition-all duration-300 whitespace-nowrap",
                isMobile ? "block" : "opacity-0 group-hover:opacity-100"
              )}>
                                 {session?.user?.email || '用户'}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}