'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

export default function ExpensePage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [isLoading, session, router]);

  if (isLoading || loading) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex">
          {/* 二级菜单区域 */}
          <div className="hidden md:block fixed left-[57px] top-0 h-[calc(100vh-0px)] w-[240px] bg-white border-r z-[5]">
            <div className="flex h-[48px] items-center px-6 border-b">
              <h1 className="text-2xl font-semibold text-gray-900">收支管理</h1>
            </div>
            <div className="space-y-1 p-2">
              <Link
                href="/finance/income"
                className="flex items-center rounded-md py-2 px-3 hover:bg-primary/10 hover:text-primary"
              >
                <span className="text-[13px]">收入管理</span>
              </Link>
              <Link
                href="/finance/expense"
                className="flex items-center rounded-md py-2 px-3 bg-primary/10 text-primary"
              >
                <span className="text-[13px]">支出管理</span>
              </Link>
              <Link
                href="/finance/settlement"
                className="flex items-center rounded-md py-2 px-3 hover:bg-primary/10 hover:text-primary"
              >
                <span className="text-[13px]">结算管理</span>
              </Link>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-1 flex">
        {/* 二级菜单区域 */}
        <div className="hidden md:block fixed left-[57px] top-0 h-[calc(100vh-0px)] w-[240px] bg-white border-r z-[5]">
          <div className="flex h-[48px] items-center px-6 border-b">
            <h1 className="text-2xl font-semibold text-gray-900">收支管理</h1>
          </div>
          <div className="space-y-1 p-2">
            <Link
              href="/finance/income"
              className="flex items-center rounded-md py-2 px-3 hover:bg-primary/10 hover:text-primary"
            >
              <span className="text-[13px]">收入管理</span>
            </Link>
            <Link
              href="/finance/expense"
              className="flex items-center rounded-md py-2 px-3 bg-primary/10 text-primary"
            >
              <span className="text-[13px]">支出管理</span>
            </Link>
            <Link
              href="/finance/settlement"
              className="flex items-center rounded-md py-2 px-3 hover:bg-primary/10 hover:text-primary"
            >
              <span className="text-[13px]">结算管理</span>
            </Link>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          <div className="bg-white shadow-sm border rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="text-center text-gray-500">
                支出管理功能开发中...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}