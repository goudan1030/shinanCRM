'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function UserFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);
      return params.toString();
    },
    [searchParams]
  );

  const handleSearch = () => {
    const currentValue = searchParams.get('search') || '';
    router.push(pathname + '?' + createQueryString('search', currentValue));
  };

  const handleReset = () => {
    const params = new URLSearchParams();
    router.push(pathname);
  };

  return (
    <div className="h-full bg-white relative z-[998]">
      <div className="flex h-[48px] items-center px-6 border-b">
        <h1 className="text-2xl font-semibold text-gray-900">用户管理</h1>
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">关键词搜索</label>
          <div className="flex gap-2">
            <Input
              placeholder="搜索手机号/用户名/昵称"
              value={searchParams.get('search') || ''}
              onChange={(e) => {
                router.push(pathname + '?' + createQueryString('search', e.target.value));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="text-[13px]"
            />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReset}
            className="w-full mt-2"
          >
            重置筛选
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">用户类型</label>
          <Select
            value={searchParams.get('memberType') || 'all'}
            onValueChange={(value) => {
              router.push(pathname + '?' + createQueryString('memberType', value));
            }}
          >
            <SelectTrigger className="text-[13px]">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="普通用户">普通用户</SelectItem>
              <SelectItem value="一次性用户">一次性用户</SelectItem>
              <SelectItem value="年费用户">年费用户</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">用户状态</label>
          <Select
            value={searchParams.get('status') || 'all'}
            onValueChange={(value) => {
              router.push(pathname + '?' + createQueryString('status', value));
            }}
          >
            <SelectTrigger className="text-[13px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有状态</SelectItem>
              <SelectItem value="active">已激活</SelectItem>
              <SelectItem value="not-logged-in">未登录</SelectItem>
              <SelectItem value="need-setup">需设置</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
} 