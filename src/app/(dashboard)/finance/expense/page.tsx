'use client';

import { useEffect, useState, useCallback, ChangeEvent } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';
import { Session } from '@supabase/auth-helpers-nextjs';
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { useRefresh } from '@/hooks/use-refresh';

// 输入事件处理类型定义
type HandleInputChange = (e: ChangeEvent<HTMLInputElement>, field: string) => void;

interface ExpenseRecord {
  id: string;
  expense_date: string;
  amount: number;
  notes: string;
  operator_id: string;
  created_at: string;
}

interface EditExpenseData {
  expense_date: string;
  amount: string;
  notes: string;
}

// 定义API响应的类型
interface ExpenseListResponse {
  records?: ExpenseRecord[];
  total: number;
  totalPages: number;
  error?: string;
}

export default function ExpensePage() {
  const { toast } = useToast();
  const { session, isLoading } = useAuth() as { session: Session | null, isLoading: boolean };
  const router = useRouter();
  const { refreshData, createNoCacheRequest } = useRefresh();
  
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  const [monthFilter, setMonthFilter] = useState((new Date().getMonth() + 1).toString());
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const searchParams = new URLSearchParams();
      searchParams.append('page', currentPage.toString());
      searchParams.append('pageSize', pageSize.toString());
      if (searchKeyword) searchParams.append('searchKeyword', searchKeyword);
      if (monthFilter) searchParams.append('month', monthFilter);
      if (yearFilter) searchParams.append('year', yearFilter);
      // 添加时间戳，避免缓存
      searchParams.append('_t', Date.now().toString());

      // 使用createNoCacheRequest创建防缓存请求
      const { url, options } = createNoCacheRequest(`/api/finance/expense/list?${searchParams.toString()}`);
      const response = await fetch(url, options);
      
      if (!response.ok) throw new Error('获取数据失败');
      
      const data = await response.json() as ExpenseListResponse;
      setRecords(data.records || []);
      setTotalCount(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('获取支出记录失败:', error);
      toast({
        variant: 'destructive',
        title: '获取支出记录失败',
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, monthFilter, searchKeyword, toast, yearFilter, createNoCacheRequest]);

  useEffect(() => {
    if (session) {
      fetchRecords();
    }
  }, [session, fetchRecords]);

  const [newExpenseDialogOpen, setNewExpenseDialogOpen] = useState(false);
  const [newExpenseData, setNewExpenseData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    amount: '',
    notes: ''
  });
  const [newExpenseLoading, setNewExpenseLoading] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editExpenseData, setEditExpenseData] = useState<EditExpenseData>({
    expense_date: '',
    amount: '',
    notes: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  // 输入变更处理
  const handleNewExpenseChange: HandleInputChange = (e, field) => {
    const value = e.target.value;
    setNewExpenseData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditExpenseChange: HandleInputChange = (e, field) => {
    const value = e.target.value;
    setEditExpenseData(prev => ({ ...prev, [field]: value }));
  };

  // 处理搜索输入变化
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchKeyword(value);
  };

  if (isLoading || loading) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-1 flex">

        {/* 操作功能区域 - 应该位于内容区域的左侧而非二级菜单下 */}
        <div className="w-[240px] border-r border-gray-200 bg-white fixed left-[297px] top-[48px] bottom-0 z-[5]">
          <div className="flex flex-col p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">搜索</label>
              <Input 
                placeholder="搜索备注"
                value={searchKeyword}
                onChange={handleSearchChange}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">年份筛选</label>
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
              <label className="text-sm font-medium">月份筛选</label>
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
        <div className="flex-1 overflow-hidden ml-[537px]">
          {/* 固定在顶部的操作区域 */}
          <div className="h-[40px] bg-white flex items-center px-4 space-x-2 border-b fixed top-[48px] right-0 left-[537px] z-[60]">
            <Button
              onClick={() => setNewExpenseDialogOpen(true)}
              size="sm"
              className="h-[28px]"
            >
              新增支出
            </Button>
          </div>
          
          <div className="space-y-6 h-[calc(100vh-88px)] overflow-auto mt-[38px]">
            {totalPages > 1 && (
              <div className="h-[36px] flex items-center justify-between border-t fixed bottom-0 left-[537px] right-0 bg-white z-50 px-4">
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

            <div className="bg-white shadow-sm rounded-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="sticky top-0 bg-[#f9fafb] z-40 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">支出日期</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备注</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <div className="space-y-4 mt-[40px]">
                        {Array.from({ length: 10 }).map((_, index) => (
                          <div key={index} className="flex items-center space-x-4">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-4 w-[120px]" />
                            <Skeleton className="h-4 w-[80px]" />
                            <Skeleton className="h-4 w-[100px]" />
                          </div>
                        ))}
                      </div>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      records.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(record.expense_date).toLocaleDateString('zh-CN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">¥{record.amount.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate">{record.notes || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(record.created_at).toLocaleString('zh-CN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRecordId(record.id);
                                  setEditExpenseData({
                                    expense_date: record.expense_date.split('T')[0],
                                    amount: record.amount.toString(),
                                    notes: record.notes || ''
                                  });
                                  setEditDialogOpen(true);
                                }}
                                className="h-8 px-2 text-primary hover:bg-primary/10"
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
                                className="h-8 px-2 text-destructive hover:bg-destructive/10"
                              >
                                删除
                              </Button>
                            </div>
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

      <Dialog open={newExpenseDialogOpen} onOpenChange={setNewExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增支出</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">支出日期</label>
              <Input
                type="date"
                value={newExpenseData.expense_date}
                onChange={(e) => handleNewExpenseChange(e, 'expense_date')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">金额</label>
              <Input
                type="number"
                value={newExpenseData.amount}
                onChange={(e) => handleNewExpenseChange(e, 'amount')}
                placeholder="请输入金额"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">备注</label>
              <Input
                value={newExpenseData.notes}
                onChange={(e) => handleNewExpenseChange(e, 'notes')}
                placeholder="请输入备注"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewExpenseDialogOpen(false)}
              disabled={newExpenseLoading}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!newExpenseData.amount || parseFloat(newExpenseData.amount) <= 0) {
                  toast({
                    variant: 'destructive',
                    title: '创建失败',
                    description: '请输入有效的金额'
                  });
                  return;
                }

                setNewExpenseLoading(true);
                try {
                  // 使用防缓存请求
                  const { options } = createNoCacheRequest('/api/finance/expense');
                  const response = await fetch('/api/finance/expense', {
                    ...options,
                    method: 'POST',
                    headers: {
                      ...options.headers,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      expense_date: newExpenseData.expense_date,
                      amount: parseFloat(newExpenseData.amount),
                      notes: newExpenseData.notes || null,
                      operator_id: session?.user?.id
                    })
                  });
                  
                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error((error as {message?: string}).message || '创建失败');
                  }

                  toast({
                    title: '创建成功',
                    description: '支出记录已保存'
                  });

                  setNewExpenseDialogOpen(false);
                  setNewExpenseData({
                    expense_date: new Date().toISOString().split('T')[0],
                    amount: '',
                    notes: ''
                  });
                  
                  // 使用刷新数据函数确保获取最新数据
                  refreshData(fetchRecords);
                } catch (error) {
                  console.error('创建支出记录失败:', error);
                  toast({
                    variant: 'destructive',
                    title: '创建失败',
                    description: error instanceof Error ? error.message : '操作失败，请重试'
                  });
                } finally {
                  setNewExpenseLoading(false);
                }
              }}
              disabled={newExpenseLoading}
            >
              {newExpenseLoading ? '保存中...' : '保存'}
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
            <p className="text-sm text-gray-500">确定要删除这条支出记录吗？此操作不可撤销。</p>
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
                  // 使用防缓存请求
                  const { options } = createNoCacheRequest('/api/finance/expense/delete');
                  const response = await fetch('/api/finance/expense/delete', {
                    ...options,
                    method: 'POST',
                    headers: {
                      ...options.headers,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ id: selectedRecordId })
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error((error as {error?: string}).error || '删除失败');
                  }

                  toast({
                    title: '删除成功',
                    description: '支出记录已删除'
                  });

                  // 先关闭对话框
                  setDeleteDialogOpen(false);
                  setSelectedRecordId(null);
                  
                  // 刷新路由缓存并重新获取数据
                  refreshData(fetchRecords);
                } catch (error) {
                  console.error('删除支出记录失败:', error);
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑支出</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">支出日期</label>
              <Input
                type="date"
                value={editExpenseData.expense_date}
                onChange={(e) => handleEditExpenseChange(e, 'expense_date')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">金额</label>
              <Input
                type="number"
                value={editExpenseData.amount}
                onChange={(e) => handleEditExpenseChange(e, 'amount')}
                placeholder="请输入金额"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">备注</label>
              <Input
                value={editExpenseData.notes}
                onChange={(e) => handleEditExpenseChange(e, 'notes')}
                placeholder="请输入备注"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={editLoading}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!editExpenseData.amount || parseFloat(editExpenseData.amount) <= 0) {
                  toast({
                    variant: 'destructive',
                    title: '更新失败',
                    description: '请输入有效的金额'
                  });
                  return;
                }

                setEditLoading(true);
                try {
                  // 使用防缓存请求
                  const { options } = createNoCacheRequest('/api/finance/expense/update');
                  const response = await fetch('/api/finance/expense/update', {
                    ...options,
                    method: 'POST',
                    headers: {
                      ...options.headers,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      id: selectedRecordId,
                      expense_date: editExpenseData.expense_date,
                      amount: parseFloat(editExpenseData.amount),
                      notes: editExpenseData.notes || null
                    })
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error((error as {message?: string}).message || '更新失败');
                  }

                  toast({
                    title: '更新成功',
                    description: '支出记录已更新'
                  });

                  // 先关闭对话框
                  setEditDialogOpen(false);
                  setSelectedRecordId(null);
                  
                  // 刷新路由缓存并重新获取数据
                  refreshData(fetchRecords);
                } catch (error) {
                  console.error('更新支出记录失败:', error);
                  toast({
                    variant: 'destructive',
                    title: '更新失败',
                    description: error instanceof Error ? error.message : '操作失败，请重试'
                  });
                } finally {
                  setEditLoading(false);
                }
              }}
              disabled={editLoading}
            >
              {editLoading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}