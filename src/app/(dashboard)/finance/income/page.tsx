'use client';

import { useEffect, useState, ChangeEvent, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface SessionUser {
  id: number;
  email?: string;
  name?: string;
  role?: string;
}

interface SessionType {
  user?: SessionUser;
}

interface IncomeRecord {
  id: string;
  payment_date: string;
  payment_method: string;
  amount: number;
  member_no: string;
  notes: string;
  operator_id: string;
  created_at: string;
}

export default function IncomePage() {
  const { toast } = useToast();
  const { session, isLoading } = useAuth() as { session: SessionType | null, isLoading: boolean };
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  const [monthFilter, setMonthFilter] = useState((new Date().getMonth() + 1).toString());
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  // Dialog状态
  const [newIncomeDialogOpen, setNewIncomeDialogOpen] = useState(false);
  const [newIncomeData, setNewIncomeData] = useState({
    member_no: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    amount: '',
    notes: ''
  });
  const [newIncomeLoading, setNewIncomeLoading] = useState(false);
  
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editIncomeData, setEditIncomeData] = useState({
    member_no: '',
    payment_date: '',
    payment_method: '',
    amount: '',
    notes: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  const fetchRecords = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        searchKeyword: searchKeyword,
        paymentMethod: paymentMethodFilter,
        month: monthFilter,
        year: yearFilter,
        _t: Date.now().toString()
      });

      const response = await fetch(`/api/finance/income/list?${queryParams}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error('获取数据失败');
      }

      const data = await response.json() as {
        records: IncomeRecord[];
        total: number;
        totalPages: number;
      };
      setRecords(data.records || []);
      setTotalCount(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('获取收入记录失败:', error);
      toast({
        variant: 'destructive',
        title: '获取收入记录失败',
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchRecords();
    }
  }, [session]);

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'ALIPAY':
        return '支付宝';
      case 'WECHAT_WANG':
        return '微信王';
      case 'WECHAT_ZHANG':
        return '微信张';
      case 'ICBC_QR':
        return '工商二维码';
      case 'CORPORATE':
        return '对公账户';
      default:
        return '未知';
    }
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
    <div className="min-h-screen">
      <div className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h1 className="text-lg sm:text-xl font-semibold">收入管理</h1>
          <Button 
            onClick={() => setNewIncomeDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            新增收入
          </Button>
        </div>

        <Card className="p-3 sm:p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">搜索</label>
              <Input
                placeholder="搜索会员编号或备注"
                value={searchKeyword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchKeyword(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">支付方式</label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="支付方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="ALIPAY">支付宝</SelectItem>
                  <SelectItem value="WECHAT_WANG">微信王</SelectItem>
                  <SelectItem value="WECHAT_ZHANG">微信张</SelectItem>
                  <SelectItem value="ICBC_QR">工商二维码</SelectItem>
                  <SelectItem value="CORPORATE">对公账户</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">年份</label>
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
              <label className="text-sm font-medium text-gray-700">月份</label>
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
        </Card>

        <div className="mb-4">
          <div className="text-sm text-gray-500">
            共 {totalCount} 条记录
          </div>
        </div>

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
                        <span className="font-medium text-base">{record.member_no}</span>
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {getPaymentMethodText(record.payment_method)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(record.payment_date).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium text-green-600">
                        ¥{record.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* 卡片内容 */}
                  <div className="space-y-2 text-sm mb-3">
                    {record.notes && (
                      <div>
                        <span className="text-gray-500">备注：</span>
                        <span>{record.notes}</span>
                      </div>
                    )}
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
                        setEditIncomeData({
                          member_no: record.member_no,
                          payment_date: record.payment_date.split('T')[0],
                          payment_method: record.payment_method,
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

            {/* 桌面端表格布局 */}
            <div className="hidden lg:block bg-white shadow-sm rounded-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="sticky top-0 bg-[#f9fafb] z-40 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">会员编号</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">支付日期</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">支付方式</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备注</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.member_no}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(record.payment_date).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getPaymentMethodText(record.payment_method)}</td>
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
                                setEditIncomeData({
                                  member_no: record.member_no,
                                  payment_date: record.payment_date.split('T')[0],
                                  payment_method: record.payment_method,
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

      {/* 新增收入Dialog */}
      <Dialog 
        open={newIncomeDialogOpen} 
        onOpenChange={setNewIncomeDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增收入</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">会员编号</label>
              <Input
                value={newIncomeData.member_no}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewIncomeData({ ...newIncomeData, member_no: e.target.value })}
                placeholder="请输入会员编号"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">支付日期</label>
              <Input
                type="date"
                value={newIncomeData.payment_date}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewIncomeData({ ...newIncomeData, payment_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">支付方式</label>
              <Select
                value={newIncomeData.payment_method}
                onValueChange={(value) => setNewIncomeData({ ...newIncomeData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择支付方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALIPAY">支付宝</SelectItem>
                  <SelectItem value="WECHAT_WANG">微信王</SelectItem>
                  <SelectItem value="WECHAT_ZHANG">微信张</SelectItem>
                  <SelectItem value="ICBC_QR">工商二维码</SelectItem>
                  <SelectItem value="CORPORATE">对公账户</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">金额</label>
              <Input
                type="number"
                value={newIncomeData.amount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewIncomeData({ ...newIncomeData, amount: e.target.value })}
                placeholder="请输入金额"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">备注</label>
              <Input
                value={newIncomeData.notes}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewIncomeData({ ...newIncomeData, notes: e.target.value })}
                placeholder="请输入备注"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewIncomeDialogOpen(false)}
              disabled={newIncomeLoading}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!newIncomeData.member_no) {
                  toast({
                    variant: 'destructive',
                    title: '创建失败',
                    description: '请输入会员编号'
                  });
                  return;
                }
                if (!newIncomeData.payment_method) {
                  toast({
                    variant: 'destructive',
                    title: '创建失败',
                    description: '请选择支付方式'
                  });
                  return;
                }
                if (!newIncomeData.amount || parseFloat(newIncomeData.amount) <= 0) {
                  toast({
                    variant: 'destructive',
                    title: '创建失败',
                    description: '请输入有效的金额'
                  });
                  return;
                }

                setNewIncomeLoading(true);
                try {
                  const response = await fetch('/api/finance/income', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      member_no: newIncomeData.member_no,
                      payment_date: newIncomeData.payment_date,
                      payment_method: newIncomeData.payment_method,
                      amount: parseFloat(newIncomeData.amount),
                      notes: newIncomeData.notes || null,
                      operator_id: session?.user?.id
                    })
                  });

                  if (!response.ok) {
                    const errorData = await response.json() as { error: string };
                    throw new Error(errorData.error || '创建失败');
                  }

                  toast({
                    title: '创建成功',
                    description: '收入记录已保存'
                  });

                  setNewIncomeDialogOpen(false);
                  setNewIncomeData({
                    member_no: '',
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_method: '',
                    amount: '',
                    notes: ''
                  });
                  
                  // 刷新数据
                  await fetchRecords();
                } catch (error) {
                  console.error('创建收入记录失败:', error);
                  toast({
                    variant: 'destructive',
                    title: '创建失败',
                    description: error instanceof Error ? error.message : '操作失败，请重试'
                  });
                } finally {
                  setNewIncomeLoading(false);
                }
              }}
              disabled={newIncomeLoading}
            >
              {newIncomeLoading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onOpenChange={setDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除确认</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500">确定要删除这条收入记录吗？此操作不可撤销。</p>
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
                  const response = await fetch('/api/finance/income/delete', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ id: selectedRecordId })
                  });

                  if (!response.ok) {
                    const errorData = await response.json() as { error: string };
                    throw new Error(errorData.error || '删除失败');
                  }

                  toast({
                    title: '删除成功',
                    description: '收入记录已删除'
                  });

                  setDeleteDialogOpen(false);
                  
                  // 刷新数据
                  await fetchRecords();
                } catch (error) {
                  console.error('删除收入记录失败:', error);
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

      {/* 编辑收入Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑收入</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">会员编号</label>
              <Input
                value={editIncomeData.member_no}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditIncomeData({ ...editIncomeData, member_no: e.target.value })}
                placeholder="请输入会员编号"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">支付日期</label>
              <Input
                type="date"
                value={editIncomeData.payment_date}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditIncomeData({ ...editIncomeData, payment_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">支付方式</label>
              <Select
                value={editIncomeData.payment_method}
                onValueChange={(value) => setEditIncomeData({ ...editIncomeData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择支付方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALIPAY">支付宝</SelectItem>
                  <SelectItem value="WECHAT_WANG">微信王</SelectItem>
                  <SelectItem value="WECHAT_ZHANG">微信张</SelectItem>
                  <SelectItem value="ICBC_QR">工商二维码</SelectItem>
                  <SelectItem value="CORPORATE">对公账户</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">金额</label>
              <Input
                type="number"
                value={editIncomeData.amount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditIncomeData({ ...editIncomeData, amount: e.target.value })}
                placeholder="请输入金额"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">备注</label>
              <Input
                value={editIncomeData.notes}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEditIncomeData({ ...editIncomeData, notes: e.target.value })}
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
                if (!editIncomeData.member_no) {
                  toast({
                    variant: 'destructive',
                    title: '更新失败',
                    description: '请输入会员编号'
                  });
                  return;
                }
                if (!editIncomeData.payment_method) {
                  toast({
                    variant: 'destructive',
                    title: '更新失败',
                    description: '请选择支付方式'
                  });
                  return;
                }
                if (!editIncomeData.amount || parseFloat(editIncomeData.amount) <= 0) {
                  toast({
                    variant: 'destructive',
                    title: '更新失败',
                    description: '请输入有效的金额'
                  });
                  return;
                }

                setEditLoading(true);
                try {
                  const response = await fetch('/api/finance/income/update', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      id: selectedRecordId,
                      member_no: editIncomeData.member_no,
                      payment_date: editIncomeData.payment_date,
                      payment_method: editIncomeData.payment_method,
                      amount: parseFloat(editIncomeData.amount),
                      notes: editIncomeData.notes || null
                    })
                  });

                  if (!response.ok) {
                    const errorData = await response.json() as { error: string };
                    throw new Error(errorData.error || '更新失败');
                  }

                  toast({
                    title: '更新成功',
                    description: '收入记录已更新'
                  });

                  setEditDialogOpen(false);
                  
                  // 刷新数据
                  await fetchRecords();
                } catch (error) {
                  console.error('更新收入记录失败:', error);
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