'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';

interface SettlementRecord {
  id: string;
  settlement_date: string;
  amount: number;
  remaining_amount: number;
  operator_id: string;
  created_at: string;
}

interface SettlementRecord {
  id: string;
  settlement_date: string;
  amount: number;
  remaining_amount: number;
  operator_id: string;
  created_at: string;
}

export default function ExpensePage() {
  const { toast } = useToast();
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [records, setRecords] = useState<SettlementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  const [newSettlementDialogOpen, setNewSettlementDialogOpen] = useState(false);
  const [newSettlementData, setNewSettlementData] = useState({
    settlement_date: new Date().toISOString().split('T')[0],
    amount: '',
    remaining_amount: '',
    notes: ''
  });
  const [newSettlementLoading, setNewSettlementLoading] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [isLoading, session, router]);

  const [monthFilter, setMonthFilter] = useState((new Date().getMonth() + 1).toString());
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    if (session) {
      fetchRecords();
    }
  }, [session, searchKeyword, monthFilter, yearFilter, currentPage]);

  const fetchRecords = async () => {
    try {
      let query = supabase
        .from('settlement_records')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, (currentPage * pageSize) - 1);

      if (searchKeyword) {
        query = query.or(
          `notes.ilike.%${searchKeyword}%`
        );
      }

      if (monthFilter && monthFilter !== 'all') {
        const year = parseInt(yearFilter);
        const month = parseInt(monthFilter);
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0).toISOString();
        query = query.gte('settlement_date', startDate).lte('settlement_date', endDate);
      } else {
        const year = parseInt(yearFilter);
        const startDate = new Date(year, 0, 1).toISOString();
        const endDate = new Date(year, 11, 31).toISOString();
        query = query.gte('settlement_date', startDate).lte('settlement_date', endDate);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setRecords(data || []);
      if (count) {
        setTotalCount(count);
        setTotalPages(Math.ceil(count / pageSize));
      }
    } catch (error) {
      console.error('获取结算记录失败:', error);
      toast({
        variant: 'destructive',
        title: '获取结算记录失败',
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    } finally {
      setLoading(false);
    }
  };

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
              className="flex items-center rounded-md py-2 px-3 hover:bg-primary/10 hover:text-primary"
            >
              <span className="text-[13px]">支出管理</span>
            </Link>
            <Link
              href="/finance/settlement"
              className="flex items-center rounded-md py-2 px-3 bg-primary/10 text-primary"
            >
              <span className="text-[13px]">结算管理</span>
            </Link>
          </div>
        </div>

        {/* 操作功能区域 */}
        <div className="w-[240px] border-r border-gray-200 bg-white fixed left-[297px] top-[48px] bottom-0 z-[5]">
          <div className="flex flex-col p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">搜索</label>
              <Input
                placeholder="搜索备注"
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
        </div>

        {/* 主要内容区域 */}
        <div className="flex-1 overflow-hidden ml-[240px]">
          {/* 固定在顶部的操作区域 */}
          <div className="h-[40px] bg-white flex items-center px-4 space-x-2 border-b fixed top-[48px] right-0 left-[534px] z-50">
            <Button
              onClick={() => setNewSettlementDialogOpen(true)}
              size="sm"
              className="h-[28px]"
            >
              新增结算
            </Button>
          </div>
          
          <div className="space-y-6 h-[calc(100vh-88px)] overflow-auto mt-[38px]">
            {totalPages > 1 && (
              <div className="h-[36px] flex items-center justify-between border-t fixed bottom-0 left-[534px] right-0 bg-white z-50 px-4">
                <div className="text-sm text-gray-500">
                  共 {totalCount} 条记录
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}

            <div className="bg-white">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="sticky top-0 bg-[#f2f2f2] z-40">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">结算日期</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">结算金额</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">剩余金额</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">创建时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                          加载中...
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      records.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 h-[48px]">
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(record.settlement_date).toLocaleDateString('zh-CN')}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">¥{record.amount.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">¥{record.remaining_amount.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(record.created_at).toLocaleString('zh-CN')}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/finance/settlement/edit/${record.id}`)}
                              className="h-8 px-2 text-primary"
                            >
                              编辑
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRecordId(record.id);
                                setDeleteDialogOpen(true);
                              }}
                              className="h-8 px-2 text-destructive"
                            >
                              删除
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={newSettlementDialogOpen} onOpenChange={setNewSettlementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增结算</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">结算日期</label>
              <Input
                type="date"
                value={newSettlementData.settlement_date}
                onChange={(e) => setNewSettlementData({ ...newSettlementData, settlement_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">结算金额</label>
              <Input
                type="number"
                value={newSettlementData.amount}
                onChange={(e) => setNewSettlementData({ ...newSettlementData, amount: e.target.value })}
                placeholder="请输入结算金额"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">剩余金额</label>
              <Input
                type="number"
                value={newSettlementData.remaining_amount}
                onChange={(e) => setNewSettlementData({ ...newSettlementData, remaining_amount: e.target.value })}
                placeholder="请输入剩余金额"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewSettlementDialogOpen(false)}
              disabled={newSettlementLoading}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!newSettlementData.settlement_date) {
                  toast({
                    variant: 'destructive',
                    title: '创建失败',
                    description: '请输入结算日期'
                  });
                  return;
                }
                if (!newSettlementData.amount || parseFloat(newSettlementData.amount) <= 0) {
                  toast({
                    variant: 'destructive',
                    title: '创建失败',
                    description: '请输入有效的结算金额'
                  });
                  return;
                }
                if (!newSettlementData.remaining_amount || parseFloat(newSettlementData.remaining_amount) < 0) {
                  toast({
                    variant: 'destructive',
                    title: '创建失败',
                    description: '请输入有效的剩余金额'
                  });
                  return;
                }

                setNewSettlementLoading(true);
                try {
                  const { error } = await supabase
                    .from('settlement_records')
                    .insert([{
                      settlement_date: newSettlementData.settlement_date,
                      amount: parseFloat(newSettlementData.amount),
                      remaining_amount: parseFloat(newSettlementData.remaining_amount),
                      operator_id: session?.user?.id
                    }]);

                  if (error) throw error;

                  toast({
                    title: '创建成功',
                    description: '结算记录已保存'
                  });

                  setNewSettlementDialogOpen(false);
                  setNewSettlementData({
                    settlement_date: new Date().toISOString().split('T')[0],
                    amount: '',
                    remaining_amount: '',
                    notes: ''
                  });
                  fetchRecords();
                } catch (error) {
                  console.error('创建结算记录失败:', error);
                  toast({
                    variant: 'destructive',
                    title: '创建失败',
                    description: error instanceof Error ? error.message : '操作失败，请重试'
                  });
                } finally {
                  setNewSettlementLoading(false);
                }
              }}
              disabled={newSettlementLoading}
            >
              {newSettlementLoading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除确认</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500">确定要删除这条结算记录吗？此操作不可撤销。</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!selectedRecordId) return;

                setDeleteLoading(true);
                try {
                  const { error } = await supabase
                    .from('settlement_records')
                    .delete()
                    .eq('id', selectedRecordId);

                  if (error) throw error;

                  toast({
                    title: '删除成功',
                    description: '结算记录已删除'
                  });

                  setDeleteDialogOpen(false);
                  setSelectedRecordId(null);
                  fetchRecords();
                } catch (error) {
                  console.error('删除结算记录失败:', error);
                  toast({
                    variant: 'destructive',
                    title: '删除失败',
                    description: error instanceof Error ? error.message : '操作失败，请重试'
                  });
                } finally {
                  setDeleteLoading(false);
                }
              }}
              disabled={deleteLoading}
            >
              {deleteLoading ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}