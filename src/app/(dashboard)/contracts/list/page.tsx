'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Contract, ContractListResponse, CONTRACT_STATUS_MAP, CONTRACT_TYPE_MAP } from '@/types/contract';
import { Search, Plus, Eye, Download, Trash2, FileText, Copy, ExternalLink, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export default function ContractListPage() {
  const { toast } = useToast();
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
        ...filters
      });

      const response = await fetch(`/api/contracts?${params}`);
      const data: ContractListResponse = await response.json();

      if (response.ok) {
        setContracts(data.contracts);
        setPagination(prev => ({
          ...prev,
          total: data.total,
          totalPages: data.totalPages
        }));
      } else {
        toast({
          title: '获取合同列表失败',
          description: (data as any).error || '请稍后重试',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('获取合同列表失败:', error);
      toast({
        title: '获取合同列表失败',
        description: '网络错误，请稍后重试',
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
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };


  // 下载PDF
  const handleDownloadPDF = (contractId: number, contractNumber: string) => {
    const link = document.createElement('a');
    link.href = `/api/contracts/${contractId}/pdf`;
    link.download = `contract-${contractNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 删除合同
  const handleDeleteContract = async (contractId: number, contractNumber?: string) => {
    const confirmMessage = `确定要删除合同 ${contractNumber || contractId} 吗？\n\n此操作将同时删除：\n- 合同记录\n- 相关的签署信息\n- 所有关联数据\n\n此操作不可撤销！`;
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: 'DELETE'
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
      console.error('删除合同失败:', error);
      toast({
        title: '删除失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      });
    }
  };

  // 撤销签署
  const handleRevokeSignature = async (contractId: number, contractNumber?: string) => {
    const confirmMessage = `确定要撤销合同 ${contractNumber || contractId} 的签署吗？\n\n此操作将：\n- 将合同状态改为"待签署"\n- 清除签署时间和签名数据\n- 删除签署记录\n- 恢复合同内容为未签署状态\n\n撤销后需要重新签署！`;
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/contracts/${contractId}/revoke`, {
        method: 'POST'
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
      console.error('撤销签署失败:', error);
      toast({
        title: '撤销失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive'
      });
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'SIGNED': return 'bg-green-100 text-green-800';
      case 'EXPIRED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">合同管理</h1>
        <p className="text-gray-600">管理所有合同，包括生成、签署和下载</p>
      </div>

      {/* 搜索和筛选 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>搜索和筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <SelectItem value="MEMBERSHIP">会员服务</SelectItem>
                <SelectItem value="ONE_TIME">一次性服务</SelectItem>
                <SelectItem value="ANNUAL">年费服务</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => fetchContracts()}>
              <Search className="h-4 w-4 mr-2" />
              搜索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 合同列表 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>合同列表</CardTitle>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                共 {pagination.total} 条记录
              </div>
              <Button asChild>
                <Link href="/contracts/create">
                  <Plus className="h-4 w-4 mr-2" />
                  发起合同
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-gray-500">加载中...</div>
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <FileText className="h-8 w-8 mb-2" />
              <p>暂无合同数据</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>合同编号</TableHead>
                    <TableHead>会员信息</TableHead>
                    <TableHead>合同类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>签署时间</TableHead>
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
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const signUrl = `${window.location.origin}/contracts/sign?id=${contract.id}`;
                                  navigator.clipboard.writeText(signUrl);
                                  toast({
                                    title: '链接已复制',
                                    description: '签署链接已复制到剪贴板，可发送给客户',
                                  });
                                }}
                                title="复制签署链接"
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

              {/* 分页 */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    上一页
                  </Button>
                  
                  <span className="text-sm text-gray-500">
                    第 {pagination.page} 页，共 {pagination.totalPages} 页
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
