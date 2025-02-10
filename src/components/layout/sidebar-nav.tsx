'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Globe, Window, Settings } from 'lucide-react';

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string;
    title: string;
    icon?: React.ReactNode;
  }[];
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname();

  const defaultItems = [
    {
      title: '小程序管理',
      href: '/miniapp/config',
      icon: <Globe className="h-4 w-4" />
    },
    {
      title: '企业微信配置',
      href: '/wecom/config',
      icon: <Window className="h-4 w-4" />
    },
    {
      title: '系统设置',
      href: '/settings',
      icon: <Settings className="h-4 w-4" />
    }
  ];

  const navItems = items || defaultItems;

  return (
    <nav
      className={cn(
        'flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1',
        className
      )}
      {...props}
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
            pathname === item.href
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground'
          )}
        >
          {item.icon && <span className="mr-2">{item.icon}</span>}
          <span>{item.title}</span>
        </Link>
      ))}
    </nav>
  );
}