'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle, Activity } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface ApiCheckResult {
  path: string;
  method: string;
  description: string;
  category: string;
  status: 'healthy' | 'error' | 'timeout';
  responseTime: number;
  statusCode?: number;
  error?: string;
}

interface ApiCheckResponse {
  summary: {
    total: number;
    healthy: number;
    errors: number;
    timeouts: number;
    avgResponseTime: number;
    healthRate: string;
  };
  results: ApiCheckResult[];
  byCategory: Record<string, ApiCheckResult[]>;
  checkedAt: string;
}

export default function ApiCheckPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiCheckResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 执行API检查
  const runApiCheck = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system/api-check', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      const result = await response.json();
      
      if (response.ok && result.success && result.data) {
        setData(result.data);
        toast({
          title: '检查完成',
          description: `共检查 ${result.data.summary.total} 个接口，${result.data.summary.healthy} 个正常`,
        });
      } else {
        throw new Error(result.error || '检查失败');
      }
    } catch (error) {
      console.error('API检查失败:', error);
      toast({
        title: '检查失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时自动执行检查
  useEffect(() => {
    runApiCheck();
  }, []);

  // 获取状态图标和颜色
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'timeout':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">正常</Badge>;
      case 'error':
        return <Badge variant="destructive">错误</Badge>;
      case 'timeout':
        return <Badge className="bg-yellow-100 text-yellow-800">超时</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  // 过滤结果
  const filteredResults = selectedCategory && data
    ? data.results.filter(r => r.category === selectedCategory)
    : data?.results || [];

  // 获取所有分类
  const categories = data ? Object.keys(data.byCategory) : [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">API接口检查</h1>
          <p className="text-gray-600 mt-1">检查所有API接口的健康状态和响应时间</p>
        </div>
        <Button
          onClick={runApiCheck}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '检查中...' : '重新检查'}
        </Button>
      </div>

      {/* 统计摘要 */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>总接口数</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>正常</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data.summary.healthy}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>错误</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{data.summary.errors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>超时</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{data.summary.timeouts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>健康率</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.healthRate}</div>
              <div className="text-xs text-gray-500 mt-1">
                平均响应: {data.summary.avgResponseTime}ms
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 分类筛选 */}
      {data && categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>按分类查看</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                全部
              </Button>
              {categories.map(category => {
                const categoryResults = data.byCategory[category] || [];
                const healthyCount = categoryResults.filter(r => r.status === 'healthy').length;
                const totalCount = categoryResults.length;
                return (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category} ({healthyCount}/{totalCount})
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API检查结果列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            API接口详情
            {selectedCategory && (
              <Badge variant="outline" className="ml-2">
                {selectedCategory}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {data && `最后检查时间: ${new Date(data.checkedAt).toLocaleString('zh-CN')}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无数据
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">状态</TableHead>
                    <TableHead>接口路径</TableHead>
                    <TableHead>方法</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead className="text-right">响应时间</TableHead>
                    <TableHead className="text-right">状态码</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result, index) => (
                    <TableRow key={`${result.path}-${result.method}-${index}`}>
                      <TableCell>
                        {getStatusIcon(result.status)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {result.path}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {result.method}
                        </Badge>
                      </TableCell>
                      <TableCell>{result.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{result.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={result.responseTime > 1000 ? 'text-yellow-600 font-medium' : ''}>
                          {result.responseTime}ms
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {result.statusCode ? (
                          <Badge
                            variant={
                              result.statusCode >= 200 && result.statusCode < 300
                                ? 'default'
                                : result.statusCode >= 400 && result.statusCode < 500
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {result.statusCode}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 错误详情 */}
      {data && (data.summary.errors > 0 || data.summary.timeouts > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              异常接口详情
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredResults
                .filter(r => r.status !== 'healthy')
                .map((result, index) => (
                  <div
                    key={`error-${result.path}-${index}`}
                    className="p-3 border border-red-200 rounded-lg bg-red-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(result.status)}
                          <span className="font-mono text-sm font-medium">{result.method}</span>
                          <span className="font-mono text-sm">{result.path}</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">{result.description}</div>
                        {result.error && (
                          <div className="text-xs text-red-600 mt-1">
                            错误: {result.error}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {result.responseTime}ms
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

