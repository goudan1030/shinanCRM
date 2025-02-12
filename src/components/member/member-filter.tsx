'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function MemberFilter() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">会员筛选</h2>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">关键词搜索</label>
          <Input 
            placeholder="搜索会员编号/姓名/手机号"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">会员类型</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="选择会员类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="normal">普通会员</SelectItem>
              <SelectItem value="vip">VIP会员</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">会员状态</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="选择会员状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">已激活</SelectItem>
              <SelectItem value="inactive">未激活</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
} 