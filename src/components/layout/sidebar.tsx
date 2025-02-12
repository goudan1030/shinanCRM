'use client';

import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Users, Settings, Wallet, ArrowDownCircle, ArrowUpCircle, Calculator, LogOut, Smartphone, Building2, User, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { User as SupabaseUser } from '@supabase/supabase-js';
import { LucideIcon } from 'lucide-react';
import React from 'react';

// 扩展 User 类型
interface ExtendedUser extends SupabaseUser {
  user_metadata: {
    name?: string;
    avatar_url?: string;
  };
}

// 扩展 Session 类型
interface ExtendedSession {
  user: ExtendedUser;
}

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
}

const navigation: NavigationItem[] = [
  { name: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
  { name: '会员管理', href: '/members', icon: Users },
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

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  return (
    <div className={cn('pb-12 h-full', className)}>
      {/* 主侧边栏 - 使用 group/sidebar 来控制展开效果 */}
      <div className="hidden md:flex h-full w-[57px] hover:w-[207px] flex-col bg-white border-r transition-all duration-300 overflow-hidden group/sidebar relative z-[1001]">
        <div className="h-[48px] flex items-center border-b">
          {/* Logo 容器固定宽度 */}
          <div className="w-[57px] flex items-center justify-center flex-shrink-0">
            <Image
              src="/logo.svg"
              alt="Logo"
              width={24}
              height={24}
              className="rounded-md"
              priority
            />
          </div>
          {/* 系统名称 */}
          <div className="w-0 group-hover/sidebar:w-auto overflow-hidden transition-all duration-300">
            <p className="whitespace-nowrap text-[13px] font-medium truncate">
              CRM系统
            </p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2 space-y-1">
          {navigation.map((item) => (
            <div key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center rounded-md',
                  (item.matchPaths?.some(path => pathname.startsWith(path)) || pathname === item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <div className="w-[40px] h-[40px] flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="w-0 group-hover/sidebar:w-auto overflow-hidden transition-all duration-300">
                  <p className="whitespace-nowrap group-hover/sidebar:ml-2 text-[13px] font-medium truncate">
                    {item.name}
                  </p>
                </div>
              </Link>
            </div>
          ))}
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
                    <UserCircle className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <div className="w-0 group-hover/sidebar:w-auto overflow-hidden transition-all duration-300">
                  <p className="whitespace-nowrap group-hover/sidebar:ml-2 text-[13px] font-medium truncate">
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
    </div>
  );
}