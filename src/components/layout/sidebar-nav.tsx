'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Globe, LayoutDashboard, Settings } from 'lucide-react';
import React from 'react';

// 使用字面量类型更安全
type IconType = 'dashboard' | 'members' | 'settings';

interface SidebarNavItem {
  href: string;
  title: string;
  icon: IconType;
}

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: SidebarNavItem[];
}

// 将 getIcon 提取到组件外部
const getIcon = (icon: IconType) => {
  switch (icon) {
    case 'dashboard':
      return <LayoutDashboard className="h-4 w-4" />;
    case 'members':
      return <Globe className="h-4 w-4" />;
    case 'settings':
      return <Settings className="h-4 w-4" />;
    default:
      return null;
  }
};

// 使用命名函数表达式
const SidebarNav: React.FC<SidebarNavProps> = ({ className, items, ...props }) => {
  const pathname = usePathname();

  return (
    <nav className={cn('flex space-x-2', className)} {...props}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground',
            pathname === item.href ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
          )}
        >
          {getIcon(item.icon)}
          {item.title}
        </Link>
      ))}
    </nav>
  );
};

SidebarNav.displayName = 'SidebarNav';

export { SidebarNav };