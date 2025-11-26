'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Contract, ContractListResponse, CONTRACT_STATUS_MAP, CONTRACT_TYPE_MAP } from '@/types/contract';
import { Search, Plus, Eye, Download, Trash2, FileText, Copy, ExternalLink, RotateCcw, PenTool } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ContractListPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    status: 'all',
    contractType: 'all',
    search: ''
  });

  // 获取合同列表
  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      // 只添加非空筛选条件
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.contractType && filters.contractType !== 'all') {
        params.append('contractType', filters.contractType);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }

      console.log('请求合同列表:', `/api/contracts?${params}`);
      
      const response = await fetch(`/api/contracts?${params}`, {
        credentials: 'include',  // 确保发送cookie
        cache: 'no-store',       // 禁用缓存
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      console.log('合同列表响应状态:', response.status, response.statusText);
      
      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        console.error('合同列表API错误:', response.status, errorText);
        let errorMessage = '请稍后重试';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || `服务器错误: ${response.status}`;
        }
        toast({
          title: '获取合同列表失败',
          description: errorMessage,
          variant: 'destructive'
        });
        return;
      }

      const apiResponse = await response.json();
      console.log('合同列表API响应:', apiResponse);

      if (apiResponse.success) {
        // API使用createSuccessResponse包装，数据在data字段中
        const data: ContractListResponse = apiResponse.data || {};
        const contractsList = data.contracts || [];
        const total = data.total || 0;
        const calculatedTotalPages = data.totalPages || Math.ceil(total / pagination.limit);
        
        console.log('解析后的合同数据:', { count: contractsList.length, total, totalPages: calculatedTotalPages });
        
        setContracts(contractsList);
        setPagination(prev => ({
          ...prev,
          total: total,
          totalPages: calculatedTotalPages
        }));
      } else {
        console.error('合同列表API返回失败:', apiResponse);
        toast({
          title: '获取合同列表失败',
          description: (apiResponse && typeof apiResponse === 'object' && 'error' in apiResponse && typeof apiResponse.error === 'string') 
            ? apiResponse.error 
            : apiResponse.message || '请稍后重试',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('获取合同列表异常:', error);
      toast({
        title: '获取合同列表失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后重试',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, toast]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // 处理筛选
  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // 处理分页
  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);


  // 检测环境 - 使用useMemo缓存结果
  const environment = useMemo(() => {
    if (typeof window === 'undefined') {
      return { isWeChat: false, isIOS: false, isAndroid: false, isMobile: false };
    }
    const userAgent = navigator.userAgent;
    const isWeChat = userAgent.includes('MicroMessenger');
    const isIOS = /iPhone|iPad|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = isIOS || isAndroid;
    
    return { isWeChat, isIOS, isAndroid, isMobile };
  }, []);

  // 下载PDF - 智能处理不同环境
  const handleDownloadPDF = useCallback((contractId: number, contractNumber: string) => {
    const { isWeChat, isIOS } = environment;

    if (isWeChat) {
      // 微信环境：提供预览页面选项
      const choice = confirm(
        '请选择PDF查看方式：\n\n' +
        '点击"确定"：在专门的预览页面中查看PDF\n' +
        '点击"取消"：直接打开PDF文件\n\n' +
        '建议选择预览页面，功能更完善'
      );
      
      if (choice) {
        // 打开专门的预览页面
        window.open(`/contracts/${contractId}/preview`, '_blank');
      } else {
        // 直接打开PDF
        window.open(`/api/contracts/${contractId}/pdf?mode=preview`, '_blank');
      }
    } else if (isIOS) {
      // iOS环境：提供文件保存选项
      const confirmed = confirm(
        'iOS设备PDF下载说明：\n\n' +
        '1. 点击"确定"下载PDF文件\n' +
        '2. 在弹出的分享菜单中选择"存储到文件"\n' +
        '3. 选择保存位置（如iCloud Drive）\n' +
        '4. 点击"存储"完成保存\n\n' +
        '点击"确定"开始下载'
      );
      
      if (confirmed) {
        // iOS直接下载，系统会显示分享菜单
        const link = document.createElement('a');
        link.href = `/api/contracts/${contractId}/pdf?mode=download`;
        link.download = `contract-${contractNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      // 桌面浏览器或其他移动浏览器：直接下载
      const link = document.createElement('a');
      link.href = `/api/contracts/${contractId}/pdf?mode=download`;
      link.download = `contract-${contractNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 显示下载提示
      toast({
        title: '开始下载',
        description: `正在下载合同 ${contractNumber} 的PDF文件`,
      });
    }
  }, [environment, toast]);

  // 删除合同
  const handleDeleteContract = useCallback(async (contractId: number, contractNumber?: string) => {
    const confirmMessage = `确定要删除合同 ${contractNumber || contractId} 吗？\n\n此操作将同时删除：\n- 合同记录\n- 相关的签署信息\n- 所有关联数据\n\n此操作不可撤销！`;
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: '删除成功',
          description: '合同已删除',
        });
        fetchContracts();
      } else {
        const data = await response.json();
        toast({
          title: '删除失败',
          description: data.error || '请稍后重试',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: '删除失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      });
    }
  }, [fetchContracts, toast]);

  // 撤销签署
  const handleRevokeSignature = useCallback(async (contractId: number, contractNumber?: string) => {
    const confirmMessage = `确定要撤销合同 ${contractNumber || contractId} 的签署吗？\n\n此操作将：\n- 将合同状态改为"待签署"\n- 清除签署时间和签名数据\n- 删除签署记录\n- 恢复合同内容为未签署状态\n\n撤销后需要重新签署！`;
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/contracts/${contractId}/revoke`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '撤销成功',
          description: data.message || '签署已撤销',
        });
        fetchContracts();
      } else {
        toast({
          title: '撤销失败',
          description: data.error || '请稍后重试',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: '撤销失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      });
    }
  }, [fetchContracts, toast]);

  // 获取状态颜色 - 使用useMemo缓存
  const getStatusColor = useMemo(() => (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'SIGNED': return 'bg-green-100 text-green-800';
      case 'EXPIRED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  return (
    <div className="p-4 md:p-6 pb-[64px] min-h-screen">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">合同管理</h1>
        <p className="text-sm md:text-base text-gray-600">管理所有合同，包括生成、签署和下载</p>
      </div>

      {/* 搜索和筛选 */}
      <Card className="mb-4 md:mb-6">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">搜索和筛选</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜索合同编号、会员姓名..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="合同状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="DRAFT">草稿</SelectItem>
                <SelectItem value="PENDING">待签署</SelectItem>
                <SelectItem value="SIGNED">已签署</SelectItem>
                <SelectItem value="EXPIRED">已过期</SelectItem>
                <SelectItem value="CANCELLED">已取消</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.contractType} onValueChange={(value) => handleFilterChange('contractType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="合同类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="MEMBERSHIP">石楠文化介绍服务</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => fetchContracts()} className="h-9 md:h-10 sm:col-span-2 lg:col-span-1">
              <Search className="h-4 w-4 mr-2" />
              搜索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 合同列表 */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="text-base md:text-lg">合同列表</CardTitle>
            <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
              <div className="text-xs md:text-sm text-gray-500">
                共 {pagination.total} 条记录
              </div>
              <Button asChild className="h-8 md:h-9 text-xs md:text-sm flex-1 sm:flex-initial">
                <Link href="/contracts/create">
                  <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">发起合同</span>
                  <span className="sm:hidden">新增</span>
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-32 p-6">
              <div className="text-gray-500">加载中...</div>
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 p-6">
              <FileText className="h-8 w-8 mb-2" />
              <p>暂无合同数据</p>
            </div>
          ) : (
            <>
              {/* 移动端卡片布局 */}
              <div className="lg:hidden space-y-4 mb-[60px] p-4">
                {contracts.map((contract) => (
                  <div key={contract.id} className="bg-white rounded-lg border p-4 shadow-sm">
                    {/* 卡片头部 */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-base">{contract.contract_number}</span>
                          <Badge className={getStatusColor(contract.status)}>
                            {CONTRACT_STATUS_MAP[contract.status]}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div className="font-medium">{contract.member?.name || '未知'}</div>
                          <div className="text-xs text-gray-500">{contract.member?.member_no}</div>
                        </div>
                      </div>
                    </div>

                    {/* 卡片内容 */}
                    <div className="space-y-2 text-sm mb-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">合同类型：</span>
                        <span>{CONTRACT_TYPE_MAP[contract.contract_type]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">创建时间：</span>
                        <span className="text-xs">{new Date(contract.created_at).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">签署时间：</span>
                        <span className="text-xs">
                          {contract.signed_at 
                            ? new Date(contract.signed_at).toLocaleString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '-'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">到期时间：</span>
                        <span className={`text-xs ${
                          contract.expires_at 
                            ? (new Date(contract.expires_at) < new Date() 
                                ? 'text-red-600 font-medium' 
                                : new Date(contract.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                ? 'text-orange-600 font-medium'
                                : 'text-gray-900')
                            : 'text-green-600 font-medium'
                        }`}>
                          {contract.expires_at 
                            ? new Date(contract.expires_at).toLocaleString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '长期有效'
                          }
                        </span>
                      </div>
                    </div>

                    {/* 卡片操作按钮 */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs flex-1"
                        asChild
                      >
                        <Link href={`/contracts/${contract.id}`}>
                          <Eye className="h-3 w-3 mr-1" />
                          查看
                        </Link>
                      </Button>
                      
                      {contract.status === 'PENDING' && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 px-3 text-xs flex-1"
                            onClick={() => router.push(`/contracts/sign?id=${contract.id}`)}
                          >
                            <PenTool className="h-3 w-3 mr-1" />
                            签署
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 md:px-3 text-xs flex-1"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/contracts/${contract.id}/sign-token`, {
                                  method: 'POST',
                                  credentials: 'include',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                });
                                
                                if (response.ok) {
                                  const data = await response.json();
                                  navigator.clipboard.writeText(data.signUrl);
                                  toast({
                                    title: '安全链接已复制',
                                    description: '签署链接已复制到剪贴板',
                                  });
                                } else {
                                  const signUrl = `${window.location.origin}/contracts/sign?id=${contract.id}`;
                                  navigator.clipboard.writeText(signUrl);
                                  toast({
                                    title: '链接已复制',
                                    description: '签署链接已复制到剪贴板',
                                  });
                                }
                              } catch (error) {
                                console.error('生成安全签署链接失败:', error);
                                const signUrl = `${window.location.origin}/contracts/sign?id=${contract.id}`;
                                navigator.clipboard.writeText(signUrl);
                                toast({
                                  title: '链接已复制',
                                  description: '签署链接已复制到剪贴板',
                                });
                              }
                            }}
                            title="复制链接"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            <span className="md:hidden">复制</span>
                            <span className="hidden md:inline">复制链接</span>
                          </Button>
                        </>
                      )}
                      
                      {contract.status === 'SIGNED' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 md:px-3 text-xs flex-1"
                            onClick={() => handleDownloadPDF(contract.id, contract.contract_number)}
                            title="下载PDF"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            <span className="md:hidden">下载</span>
                            <span className="hidden md:inline">下载PDF</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs flex-1 text-orange-600"
                            onClick={() => handleRevokeSignature(contract.id, contract.contract_number)}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            撤销
                          </Button>
                        </>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs flex-1 text-red-600"
                        onClick={() => handleDeleteContract(contract.id, contract.contract_number)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 桌面端表格布局 */}
              <div className="hidden lg:block p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>合同编号</TableHead>
                      <TableHead>会员信息</TableHead>
                      <TableHead>合同类型</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>签署时间</TableHead>
                      <TableHead>到期时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">
                          {contract.contract_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{contract.member?.name || '未知'}</div>
                            <div className="text-sm text-gray-500">{contract.member?.member_no}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {CONTRACT_TYPE_MAP[contract.contract_type]}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(contract.status)}>
                            {CONTRACT_STATUS_MAP[contract.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(contract.created_at).toLocaleString('zh-CN')}
                        </TableCell>
                        <TableCell>
                          {contract.signed_at 
                            ? new Date(contract.signed_at).toLocaleString('zh-CN')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {contract.expires_at ? (
                            <div className={`${
                              new Date(contract.expires_at) < new Date() 
                                ? 'text-red-600 font-medium' 
                                : new Date(contract.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                ? 'text-orange-600 font-medium'
                                : 'text-gray-900'
                            }`}>
                              {new Date(contract.expires_at).toLocaleString('zh-CN')}
                            </div>
                          ) : (
                            <span className="text-green-600 font-medium">长期有效</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <Link href={`/contracts/${contract.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            
                            {contract.status === 'PENDING' && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => router.push(`/contracts/sign?id=${contract.id}`)}
                                  title="签署合同"
                                >
                                  <PenTool className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`/api/contracts/${contract.id}/sign-token`, {
                                        method: 'POST',
                                        credentials: 'include',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                      });
                                      
                                      if (response.ok) {
                                        const data = await response.json();
                                        navigator.clipboard.writeText(data.signUrl);
                                        toast({
                                          title: '安全链接已复制',
                                          description: '签署链接已复制到剪贴板，可发送给客户',
                                        });
                                      } else {
                                        // 如果生成令牌失败，使用默认链接
                                        const signUrl = `${window.location.origin}/contracts/sign?id=${contract.id}`;
                                        navigator.clipboard.writeText(signUrl);
                                        toast({
                                          title: '链接已复制',
                                          description: '签署链接已复制到剪贴板，可发送给客户',
                                        });
                                      }
                                    } catch (error) {
                                      console.error('生成安全签署链接失败:', error);
                                      const signUrl = `${window.location.origin}/contracts/sign?id=${contract.id}`;
                                      navigator.clipboard.writeText(signUrl);
                                      toast({
                                        title: '链接已复制',
                                        description: '签署链接已复制到剪贴板，可发送给客户',
                                      });
                                    }
                                  }}
                                  title="复制安全签署链接"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  title="预览签署页面"
                                >
                                  <Link href={`/contracts/sign?id=${contract.id}`}>
                                    <ExternalLink className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </>
                            )}
                            
                            {contract.status === 'SIGNED' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadPDF(contract.id, contract.contract_number)}
                                  title="下载PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRevokeSignature(contract.id, contract.contract_number)}
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  title="撤销签署"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteContract(contract.id, contract.contract_number)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="删除合同"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 分页 - 固定在底部，与其他页面样式一致 */}
      {!loading && pagination.total > 0 && (
        <div className="h-[48px] flex items-center justify-between border-t fixed bottom-0 left-0 md:left-[57px] lg:left-[297px] right-0 bg-white dark:bg-gray-900 z-50 px-3 md:px-6 shadow-sm">
          <div className="text-xs md:text-sm text-muted-foreground flex items-center">
            <span className="mr-1 md:mr-2">共 {pagination.total} 条</span>
            <select 
              className="ml-1 md:ml-2 px-1 md:px-2 py-1 border border-gray-300 rounded text-xs md:text-sm"
              value={pagination.limit}
              onChange={(e) => {
                setPagination(prev => ({
                  ...prev,
                  limit: Number(e.target.value),
                  page: 1 // 重置到第一页
                }));
              }}
              aria-label="每页显示条数"
              title="选择每页显示的记录数"
            >
              <option value="10">10条/页</option>
              <option value="20">20条/页</option>
              <option value="50">50条/页</option>
              <option value="100">100条/页</option>
            </select>
          </div>
          <div className="flex gap-1 md:gap-2 items-center">
            <div className="hidden sm:flex items-center text-xs md:text-sm mr-2 md:mr-4">
              <span className="mr-1 md:mr-2">跳至</span>
              <input 
                type="number" 
                min="1" 
                max={pagination.totalPages} 
                value={pagination.page}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 1 && value <= pagination.totalPages) {
                    handlePageChange(value);
                  }
                }}
                className="w-[40px] md:w-[50px] px-1 md:px-2 py-1 border border-gray-300 rounded text-center text-xs md:text-sm"
                aria-label="跳转到页码"
                placeholder="页码"
              />
              <span className="ml-1 md:ml-2">页</span>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={pagination.page === 1}
              className="h-7 md:h-8 min-w-[30px] md:min-w-[40px] px-1 md:px-2"
            >
              <span className="sr-only">首页</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="11 17 6 12 11 7"></polyline>
                <polyline points="18 17 13 12 18 7"></polyline>
              </svg>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="h-7 md:h-8 min-w-[30px] md:min-w-[40px] px-1 md:px-2"
            >
              <span className="sr-only">上一页</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </Button>
            
            <span className="px-2 md:px-4 text-xs md:text-sm">
              {pagination.page} / {pagination.totalPages}
            </span>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="h-7 md:h-8 min-w-[30px] md:min-w-[40px] px-1 md:px-2"
            >
              <span className="sr-only">下一页</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages}
              className="h-7 md:h-8 min-w-[30px] md:min-w-[40px] px-1 md:px-2"
            >
              <span className="sr-only">尾页</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="13 17 18 12 13 7"></polyline>
                <polyline points="6 17 11 12 6 7"></polyline>
              </svg>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
