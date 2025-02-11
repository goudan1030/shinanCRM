'use client';

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SearchFilterProps {
  searchKeyword: string;
  setSearchKeyword: (value: string) => void;
  paymentMethodFilter: string;
  setPaymentMethodFilter: (value: string) => void;
  yearFilter: string;
  setYearFilter: (value: string) => void;
  monthFilter: string;
  setMonthFilter: (value: string) => void;
}

export function SearchFilter({
  searchKeyword,
  setSearchKeyword,
  paymentMethodFilter,
  setPaymentMethodFilter,
  yearFilter,
  setYearFilter,
  monthFilter,
  setMonthFilter,
}: SearchFilterProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">搜索</label>
        <Input
          placeholder="搜索结算日期"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">年份筛选</label>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger>
            <SelectValue placeholder="选择年份" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 10 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <SelectItem key={year} value={String(year)}>{year}年</SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">月份筛选</label>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger>
            <SelectValue placeholder="选择月份" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}月</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}