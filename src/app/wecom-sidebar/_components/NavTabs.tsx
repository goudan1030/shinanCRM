'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const TABS = [
  { label: '快捷回复', href: '/wecom-sidebar/quick-reply', icon: '💬' },
  { label: '会员查询', href: '/wecom-sidebar/member-query', icon: '🔍' },
  { label: '客户绑定', href: '/wecom-sidebar/bind', icon: '🔗' },
  { label: '调试', href: '/wecom-sidebar/debug', icon: '🛠' }
];

export default function NavTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildTabHref = (base: string) => {
    const qs = searchParams.toString();
    return qs ? `${base}?${qs}` : base;
  };

  return (
    <nav className="flex border-b border-gray-200 bg-white">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={buildTabHref(tab.href)}
            className={[
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
              isActive
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            ].join(' ')}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
