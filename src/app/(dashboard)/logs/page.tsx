'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { operationTypeMap } from '@/lib/operation-log-utils';
import Link from 'next/link';

interface OperationLog {
  id: string;
  user_id: string;
  operation_type: string;
  target_type: string;
  target_id: string;
  detail: string;
  created_at: string;
  operator_name: string;
  operator_email: string;
}

export default function LogsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [operationType, setOperationType] = useState('');
  const [targetType, setTargetType] = useState('MEMBER');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const fetchLogs = useCallback(async () => {
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        targetType: targetType
      });
      
      if (operationType) {
        params.append('operationType', operationType);
      }
      
      if (searchKeyword) {
        params.append('keyword', searchKeyword);
      }

      const response = await fetch(`/api/logs?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取日志失败');
      }

      setLogs(data.data);
      setTotalCount(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('获取操作日志失败:', error);
      toast({
        variant: 'destructive',
        title: '获取操作日志失败',
        description: error instanceof Error ? error.message : '操作失败，请重试'
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, operationType, pageSize, searchKeyword, targetType, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDateTime = (dateTimeStr: string) => {
    return new Date(dateTimeStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-1 flex">
        {/* 操作功能区域 */}
        <div className="w-[240px] border-r border-gray-200 bg-white fixed left-[57px] top-[48px] bottom-0 z-[5]">
          <div className="flex flex-col p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">关键词搜索</label>
              <Input 
                placeholder="搜索操作详情"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">操作类型</label>
              <Select value={operationType} onValueChange={setOperationType}>
                <SelectTrigger>
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部类型</SelectItem>
                  <SelectItem value="CREATE">创建</SelectItem>
                  <SelectItem value="UPDATE">更新</SelectItem>
                  <SelectItem value="ACTIVATE">激活</SelectItem>
                  <SelectItem value="REVOKE">撤销</SelectItem>
                  <SelectItem value="UPGRADE">升级</SelectItem>
                  <SelectItem value="MATCH">匹配</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">目标类型</label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger>
                  <SelectValue placeholder="选择目标类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">会员</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={() => {
                setCurrentPage(1);
                fetchLogs();
              }}
              className="mt-4"
            >
              搜索
            </Button>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="flex-1 overflow-hidden ml-[240px]">
          <div className="h-[40px] bg-white flex items-center px-4 space-x-2 border-b fixed top-[48px] right-0 left-[297px] z-50">
            <h2 className="text-lg font-semibold">操作日志</h2>
          </div>
          
          <div className="space-y-6 h-[calc(100vh-88px)] overflow-auto mt-[38px]">
            <div className="h-[36px] flex items-center justify-between border-t fixed bottom-0 left-[297px] right-0 bg-white z-50 px-4">
              <div className="text-sm text-gray-500">
                共 {totalCount} 条记录
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>

            <div className="bg-white">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="sticky top-0 bg-[#f2f2f2] z-40">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作类型</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">目标ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作详情</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">管理员</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                          加载中...
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{log.id}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {operationTypeMap[log.operation_type] || log.operation_type}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {log.target_type === 'MEMBER' ? (
                              <Link 
                                href={`/members/${log.target_id}`} 
                                className="text-blue-600 hover:underline"
                              >
                                {log.target_id}
                              </Link>
                            ) : (
                              log.target_id
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{log.detail}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{log.operator_email || log.operator_name || '未知'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDateTime(log.created_at)}
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
    </div>
  );
} 