'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function MemberFilter() {
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

  return (
    <div className="h-full bg-white relative z-[998]">
      <div className="flex h-[48px] items-center px-6 border-b">
        <h1 className="text-2xl font-semibold text-gray-900">会员管理</h1>
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">关键词搜索</label>
          <Input
            placeholder="搜索会员编号/微信/手机号"
            value={searchParams.get('keyword') || ''}
            onChange={(e) => {
              console.log('关键词搜索变更:', e.target.value);
              router.push(pathname + '?' + createQueryString('keyword', e.target.value));
            }}
            className="text-[13px]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">会员类型</label>
          <Select
            value={searchParams.get('type') || 'all'}
            onValueChange={(value) => {
              console.log('会员类型变更:', value);
              router.push(pathname + '?' + createQueryString('type', value));
            }}
          >
            <SelectTrigger className="text-[13px]">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="NORMAL">普通会员</SelectItem>
              <SelectItem value="ONE_TIME">一次性会员</SelectItem>
              <SelectItem value="ANNUAL">年费会员</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">会员状态</label>
          <Select
            value={searchParams.get('status') || 'all'}
            onValueChange={(value) => {
              console.log('会员状态变更:', value);
              router.push(pathname + '?' + createQueryString('status', value));
            }}
          >
            <SelectTrigger className="text-[13px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="ACTIVE">已激活</SelectItem>
              <SelectItem value="REVOKED">已撤销</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}