'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { History, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PushLog {
  id: number;
  type: string;
  type_text: string;
  title: string;
  content: string;
  target_users: number[] | null;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export default function PushLogsPage() {
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0
  });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    start_date: '',
    end_date: ''
  });
  const { toast } = useToast();

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date })
      });

      if (filters.type && filters.type !== 'all') {
        params.append('type', filters.type);
      }

      const response = await fetch(`/api/messages/push/logs?${params}`);
      const result = await response.json();

      if (result.success) {
        setLogs(result.data.logs);
        setPagination(result.data.pagination);
      } else {
        toast({
          title: "获取日志失败",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "获取日志失败",
        description: "网络错误，请稍后重试",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilter = () => {
    fetchLogs(1);
  };

  const handleClearFilters = () => {
    setFilters({
      type: 'all',
      start_date: '',
      end_date: ''
    });
    fetchLogs(1);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleString('zh-CN');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getTargetUsersText = (targetUsers: number[] | null) => {
    if (!targetUsers || targetUsers.length === 0) {
      return '所有用户';
    }
    
    // 检查targetUsers是否是有效的数组
    if (Array.isArray(targetUsers) && targetUsers.length > 0) {
      return `${targetUsers.length} 个指定用户`;
    }
    
    return '所有用户';
  };

  const renderLogItem = (log: PushLog) => (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant={log.type === 'announcement' ? 'default' : 'secondary'}>
            {log.type_text || '系统通知'}
          </Badge>
          <h3 className="font-medium">{log.title || '无标题'}</h3>
        </div>
        <div className="text-sm text-gray-500">
          {formatDate(log.created_at)}
        </div>
      </div>
      
      <div className="text-gray-600 text-sm">
        {log.content || '无内容'}
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <span>发送人：{log.created_by_name || '系统'}</span>
          <span>目标：{getTargetUsersText(log.target_users)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <History className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">推送日志</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
          <CardDescription>
            查看推送历史记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">推送类型</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="announcement">公告推送</SelectItem>
                  <SelectItem value="system_notice">系统通知</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">开始日期</Label>
              <Input
                id="start_date"
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">结束日期</Label>
              <Input
                id="end_date"
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              />
            </div>

            <div className="flex items-end space-x-2">
              <Button onClick={handleFilter} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                筛选
              </Button>
              <Button variant="outline" onClick={handleClearFilters} disabled={loading}>
                清空
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>推送记录</CardTitle>
          <CardDescription>
            共 {pagination.total} 条记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无推送记录
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant={log.type === 'announcement' ? 'default' : 'secondary'}>
                        {log.type_text || '系统通知'}
                      </Badge>
                      <h3 className="font-medium">{log.title || '无标题'}</h3>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                  
                  <div className="text-gray-600 text-sm">
                    {log.content || '无内容'}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span>发送人：{log.created_by_name || '系统'}</span>
                      <span>目标：{getTargetUsersText(log.target_users)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                第 {pagination.page} 页，共 {pagination.total_pages} 页
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages || loading}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
