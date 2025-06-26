'use client';

import { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Pagination } from '@/components/ui/pagination';
import { SearchFilter } from '@/components/ui/settlement';
import { LoadingRow, EmptyRow, SettlementRow } from '@/components/ui/settlement';

interface SettlementRecord {
  id: number;
  settlement_date: string;
  amount: number;
  notes: string;
  operator_id: number;
  created_at: string;
}

interface CalculationDetails {
  period: string;
  monthlyIncome: number;
  monthlyExpense: number;
  profitToSettle: number;
  settledAmount: number;
  amountToSettle: number;
}

export default function SettlementPage() {
  const { toast } = useToast();
  const { session, isLoading } = useAuth();
  const [records, setRecords] = useState<SettlementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  const [monthFilter, setMonthFilter] = useState((new Date().getMonth() + 1).toString());
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  // 自动结算相关状态
  const [autoSettleDialogOpen, setAutoSettleDialogOpen] = useState(false);
  const [autoSettleLoading, setAutoSettleLoading] = useState(false);
  const [calculationDetails, setCalculationDetails] = useState<CalculationDetails | null>(null);
  const [autoSettleSuccess, setAutoSettleSuccess] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('pageSize', pageSize.toString());
      if (searchKeyword) {
        params.append('keyword', searchKeyword);
      }
      if (monthFilter && monthFilter !== 'all') {
        params.append('month', monthFilter);
        params.append('year', yearFilter);
      } else {
        params.append('year', yearFilter);
      }

      const response = await fetch(`/api/finance/settlement/list?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取数据失败');
      }

      setRecords(data.records || []);
      setTotalCount(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / pageSize));
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
  }, [currentPage, monthFilter, pageSize, searchKeyword, toast, yearFilter]);

  useEffect(() => {
    if (session) {
      fetchRecords();
    }
  }, [session, fetchRecords]);

  const [newExpenseDialogOpen, setNewExpenseDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [editExpenseData, setEditExpenseData] = useState({
    expense_date: '',
    amount: '',
    notes: ''
  });
  const [unsettledAmount, setUnsettledAmount] = useState(0);
  const [newExpenseData, setNewExpenseData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    amount: ''
  });
  const [newExpenseLoading, setNewExpenseLoading] = useState(false);

  // 执行自动结算
  const handleAutoSettle = async () => {
    setAutoSettleLoading(true);
    setCalculationDetails(null);
    setAutoSettleSuccess(false);

    try {
      const response = await fetch('/api/finance/settlement/auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operator_id: session?.user?.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setCalculationDetails(result.calculationDetails || null);
        throw new Error(result.message || result.error || '自动结算失败');
      }

      setCalculationDetails(result.calculationDetails);
      setAutoSettleSuccess(true);
      
      toast({
        title: '自动结算成功',
        description: `已创建结算记录，金额: ¥${Number(result.calculationDetails.amountToSettle).toLocaleString()}`
      });
      
      // 刷新结算记录
      fetchRecords();
    } catch (error) {
      console.error('自动结算失败:', error);
      toast({
        variant: 'destructive',
        title: '自动结算失败',
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    } finally {
      setAutoSettleLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchRecords();
    }
  }, [session, fetchRecords]);
  

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
        {/* 操作功能区域 - 只在桌面端显示 */}
        <div className="hidden lg:block w-[240px] border-r border-gray-200 bg-white fixed left-[297px] top-[48px] bottom-0 z-[5]">
          <div className="flex flex-col p-4 space-y-4">
            <SearchFilter
              searchKeyword={searchKeyword}
              setSearchKeyword={setSearchKeyword}
              yearFilter={yearFilter}
              setYearFilter={setYearFilter}
              monthFilter={monthFilter}
              setMonthFilter={setMonthFilter}
            />
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="flex-1 overflow-hidden lg:ml-[537px]">
          {/* 固定在顶部的操作区域 - 桌面端 */}
          <div className="hidden lg:flex h-[40px] bg-white items-center px-4 space-x-2 border-b fixed top-[48px] right-0 left-[537px] z-[60]">
            <Button
              onClick={() => setNewExpenseDialogOpen(true)}
              size="sm"
              className="h-[28px]"
            >
              新增结算
            </Button>
            <Button
              onClick={() => setAutoSettleDialogOpen(true)}
              size="sm"
              variant="outline"
              className="h-[28px]"
            >
              自动结算
            </Button>
          </div>

          {/* 移动端筛选和操作区域 */}
          <div className="lg:hidden bg-white border-b p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-semibold">结算管理</h1>
              <div className="flex gap-2">
                <Button
                  onClick={() => setAutoSettleDialogOpen(true)}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                >
                  自动结算
                </Button>
                <Button
                  onClick={() => setNewExpenseDialogOpen(true)}
                  size="sm"
                  className="h-8 text-xs"
                >
                  新增结算
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <SearchFilter
                searchKeyword={searchKeyword}
                setSearchKeyword={setSearchKeyword}
                yearFilter={yearFilter}
                setYearFilter={setYearFilter}
                monthFilter={monthFilter}
                setMonthFilter={setMonthFilter}
              />
            </div>
          </div>
          
          {/* 内容区域 */}
          <div className="space-y-6 h-[calc(100vh-88px)] lg:h-[calc(100vh-88px)] overflow-auto lg:mt-[38px] p-4 lg:p-0">
            {/* 桌面端分页信息 */}
            {totalPages > 1 && (
              <div className="hidden lg:flex h-[36px] items-center justify-between border-t fixed bottom-0 left-[537px] right-0 bg-white z-50 px-4">
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

            {loading ? (
              <div className="bg-white shadow-sm rounded-sm">
                <div className="px-6 py-8 text-center text-sm text-gray-500">
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mr-2"></div>
                    加载中...
                  </div>
                </div>
              </div>
            ) : records.length === 0 ? (
              <div className="bg-white shadow-sm rounded-sm">
                <div className="px-6 py-8 text-center text-sm text-gray-500">
                  暂无数据
                </div>
              </div>
            ) : (
              <>
                {/* 移动端卡片布局 */}
                <div className="lg:hidden space-y-4">
                  {records.map((record) => (
                    <div key={record.id} className="bg-white rounded-lg border p-4 shadow-sm">
                      {/* 卡片头部 */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                              结算
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(record.settlement_date).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-medium text-purple-600">
                            ¥{record.amount.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* 卡片内容 */}
                      <div className="space-y-2 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">创建时间：</span>
                          <span>{new Date(record.created_at).toLocaleString('zh-CN')}</span>
                        </div>
                      </div>

                      {/* 卡片操作按钮 */}
                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => {
                            setSelectedRecordId(record.id);
                            setEditExpenseData({
                              expense_date: record.settlement_date.split('T')[0],
                              amount: record.amount.toString(),
                              notes: record.notes || ''
                            });
                            setEditDialogOpen(true);
                          }}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs text-red-600"
                          onClick={() => {
                            setSelectedRecordId(record.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 移动端分页 */}
                {totalPages > 1 && (
                  <div className="lg:hidden flex items-center justify-between border-t pt-4">
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

                {/* 桌面端表格布局 */}
                <div className="hidden lg:block bg-white shadow-sm rounded-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="sticky top-0 bg-[#f9fafb] z-40 border-b border-gray-200">
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">结算日期</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">结算金额</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {records.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(record.settlement_date).toLocaleDateString('zh-CN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                              ¥{record.amount.toLocaleString()}
                            </td>
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
                                      expense_date: record.settlement_date.split('T')[0],
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 自动结算对话框 */}
      <Dialog open={autoSettleDialogOpen} onOpenChange={setAutoSettleDialogOpen}>
        <DialogContent className="w-[95%] max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle>自动结算</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {calculationDetails ? (
              <div className="space-y-3">
                <h3 className="text-md font-medium">{autoSettleSuccess ? '结算成功' : '结算详情'}</h3>
                <div className="border rounded-md p-3 space-y-2 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">结算期间:</span>
                    <span className="text-sm font-medium">{calculationDetails.period}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">当月收入:</span>
                    <span className="text-sm font-medium">¥{calculationDetails.monthlyIncome.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">当月支出:</span>
                    <span className="text-sm font-medium">¥{calculationDetails.monthlyExpense.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">应结算金额 (营业额的50%):</span>
                    <span className="text-sm font-medium">¥{calculationDetails.profitToSettle.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">已结算金额:</span>
                    <span className="text-sm font-medium">¥{calculationDetails.settledAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-sm text-gray-600">本次结算金额:</span>
                    <span className="text-sm font-medium text-primary">¥{calculationDetails.amountToSettle.toLocaleString()}</span>
                  </div>
                </div>

                {autoSettleSuccess && (
                  <p className="text-sm text-green-600">
                    结算记录已成功创建，可以在列表中查看。
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                系统将自动计算当月待结算金额并创建结算记录。
                <br />
                结算金额计算公式: (当月收入 - 当月支出) / 2 - 已结算金额
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAutoSettleDialogOpen(false);
                setCalculationDetails(null);
                setAutoSettleSuccess(false);
              }}
            >
              {autoSettleSuccess ? '关闭' : '取消'}
            </Button>
            {!autoSettleSuccess && (
              <Button
                onClick={handleAutoSettle}
                disabled={autoSettleLoading}
              >
                {autoSettleLoading ? '结算中...' : '开始结算'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newExpenseDialogOpen} onOpenChange={setNewExpenseDialogOpen}>
        <DialogContent className="w-[95%] max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle>新增结算</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">结算日期</label>
              <Input
                type="date"
                value={newExpenseData.expense_date}
                onChange={(e) => setNewExpenseData({ ...newExpenseData, expense_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">结算金额</label>
              <Input
                type="number"
                value={newExpenseData.amount}
                onChange={(e) => setNewExpenseData({ ...newExpenseData, amount: e.target.value })}
                placeholder="请输入结算金额"
              />
              <p className="text-sm text-muted-foreground">当月待结算金额：¥{unsettledAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                  const response = await fetch('/api/finance/settlement/create', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      settlement_date: newExpenseData.expense_date,
                      amount: parseFloat(newExpenseData.amount),
                      operator_id: session?.user?.id
                    })
                  });

                  const result = await response.json();
                  if (!response.ok) throw new Error(result.error);

                  toast({
                    title: '创建成功',
                    description: '结算记录已保存'
                  });

                  setNewExpenseDialogOpen(false);
                  setNewExpenseData({
                    expense_date: new Date().toISOString().split('T')[0],
                    amount: ''
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
        <DialogContent className="w-[95%] max-w-md mx-auto">
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
                  const response = await fetch('/api/finance/settlement/delete', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ id: selectedRecordId })
                  });

                  const result = await response.json();
                  if (!response.ok) throw new Error(result.error);

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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-[95%] max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle>编辑结算</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">结算日期</label>
              <Input
                type="date"
                value={editExpenseData.expense_date}
                onChange={(e) => setEditExpenseData({ ...editExpenseData, expense_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">结算金额</label>
              <Input
                type="number"
                value={editExpenseData.amount}
                onChange={(e) => setEditExpenseData({ ...editExpenseData, amount: e.target.value })}
                placeholder="请输入结算金额"
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
                    title: '编辑失败',
                    description: '请输入有效的金额'
                  });
                  return;
                }

                setEditLoading(true);
                try {
                  const response = await fetch('/api/finance/settlement/update', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      id: selectedRecordId,
                      settlement_date: editExpenseData.expense_date,
                      amount: parseFloat(editExpenseData.amount)
                    })
                  });

                  const result = await response.json();
                  if (!response.ok) throw new Error(result.error);

                  toast({
                    title: '编辑成功',
                    description: '结算记录已更新'
                  });

                  setEditDialogOpen(false);
                  setSelectedRecordId(null);
                  fetchRecords();
                } catch (error) {
                  console.error('编辑结算记录失败:', error);
                  toast({
                    variant: 'destructive',
                    title: '编辑失败',
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