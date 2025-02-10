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
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

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
  }, [session, searchKeyword, paymentMethodFilter, monthFilter, yearFilter, currentPage]);

  const fetchRecords = async () => {
    try {
      let query = supabase
        .from('income_records')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, (currentPage * pageSize) - 1);

      if (searchKeyword) {
        query = query.or(
          `member_no.ilike.%${searchKeyword}%,notes.ilike.%${searchKeyword}%`
        );
      }

      if (paymentMethodFilter && paymentMethodFilter !== 'all') {
        query = query.eq('payment_method', paymentMethodFilter);
      }

      if (monthFilter && monthFilter !== 'all') {
        const year = parseInt(yearFilter);
        const month = parseInt(monthFilter);
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0).toISOString();
        query = query.gte('payment_date', startDate).lte('payment_date', endDate);
      } else {
        // 当月份选择"全部"时，仍然按照年份筛选
        const year = parseInt(yearFilter);
        const startDate = new Date(year, 0, 1).toISOString();
        const endDate = new Date(year, 11, 31).toISOString();
        query = query.gte('payment_date', startDate).lte('payment_date', endDate);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setRecords(data || []);
      if (count) {
        setTotalCount(count);
        setTotalPages(Math.ceil(count / pageSize));
      }
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
        <div className="flex-1 flex">
          {/* 二级菜单区域 */}
          <div className="hidden md:block fixed left-[57px] top-0 h-[calc(100vh-0px)] w-[240px] bg-white border-r z-[5]">
            <div className="flex h-[48px] items-center px-6 border-b">
              <h1 className="text-2xl font-semibold text-gray-900">收支管理</h1>
            </div>
            <div className="space-y-1 p-2">
              <Link
                href="/finance/income"
                className="flex items-center rounded-md py-2 px-3 bg-primary/10 text-primary"
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
              className="flex items-center rounded-md py-2 px-3 bg-primary/10 text-primary"
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
              className="flex items-center rounded-md py-2 px-3 hover:bg-primary/10 hover:text-primary"
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
                placeholder="搜索会员编号或备注"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">支付方式筛选</label>
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
              onClick={() => setNewIncomeDialogOpen(true)}
              size="sm"
              className="h-[28px]"
            >
              新增收入
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
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">会员编号</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">支付日期</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">支付方式</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">金额</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">备注</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">创建时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                          加载中...
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      records.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 h-[48px]">
                          <td className="px-4 py-2 text-sm text-gray-900">{record.member_no}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(record.payment_date).toLocaleDateString('zh-CN')}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{getPaymentMethodText(record.payment_method)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">¥{record.amount.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{record.notes || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(record.created_at).toLocaleString('zh-CN')}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 space-x-2">
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

      <Dialog open={newIncomeDialogOpen} onOpenChange={setNewIncomeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增收入</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">会员编号</label>
              <Input
                value={newIncomeData.member_no}
                onChange={(e) => setNewIncomeData({ ...newIncomeData, member_no: e.target.value })}
                placeholder="请输入会员编号"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">支付日期</label>
              <Input
                type="date"
                value={newIncomeData.payment_date}
                onChange={(e) => setNewIncomeData({ ...newIncomeData, payment_date: e.target.value })}
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
                onChange={(e) => setNewIncomeData({ ...newIncomeData, amount: e.target.value })}
                placeholder="请输入金额"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">备注</label>
              <Input
                value={newIncomeData.notes}
                onChange={(e) => setNewIncomeData({ ...newIncomeData, notes: e.target.value })}
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
                  const { error } = await supabase
                    .from('income_records')
                    .insert([{
                      member_no: newIncomeData.member_no,
                      payment_date: newIncomeData.payment_date,
                      payment_method: newIncomeData.payment_method,
                      amount: parseFloat(newIncomeData.amount),
                      notes: newIncomeData.notes || null,
                      operator_id: session?.user?.id
                    }]);

                  if (error) throw error;

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
                  fetchRecords();
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
                  const { error } = await supabase
                    .from('income_records')
                    .delete()
                    .eq('id', selectedRecordId);

                  if (error) throw error;

                  toast({
                    title: '删除成功',
                    description: '收入记录已删除'
                  });

                  setDeleteDialogOpen(false);
                  setSelectedRecordId(null);
                  fetchRecords();
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑收入</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">会员编号</label>
              <Input
                value={editIncomeData.member_no}
                onChange={(e) => setEditIncomeData({ ...editIncomeData, member_no: e.target.value })}
                placeholder="请输入会员编号"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">支付日期</label>
              <Input
                type="date"
                value={editIncomeData.payment_date}
                onChange={(e) => setEditIncomeData({ ...editIncomeData, payment_date: e.target.value })}
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
                onChange={(e) => setEditIncomeData({ ...editIncomeData, amount: e.target.value })}
                placeholder="请输入金额"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">备注</label>
              <Input
                value={editIncomeData.notes}
                onChange={(e) => setEditIncomeData({ ...editIncomeData, notes: e.target.value })}
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
                  const { error } = await supabase
                    .from('income_records')
                    .update({
                      member_no: editIncomeData.member_no,
                      payment_date: editIncomeData.payment_date,
                      payment_method: editIncomeData.payment_method,
                      amount: parseFloat(editIncomeData.amount),
                      notes: editIncomeData.notes || null
                    })
                    .eq('id', selectedRecordId);

                  if (error) throw error;

                  toast({
                    title: '更新成功',
                    description: '收入记录已更新'
                  });

                  setEditDialogOpen(false);
                  setSelectedRecordId(null);
                  fetchRecords();
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