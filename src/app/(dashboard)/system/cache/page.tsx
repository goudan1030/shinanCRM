'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle,
  RefreshCw,
  Trash2,
  CheckCircle,
  Info,
  AlertTriangle
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// 缓存状态接口
interface CacheStats {
  namespace: string;
  size: number;
  capacity: number;
  hits: number;
  misses: number;
  hitRate: number;
  expired: number;
}

// 缓存健康状态接口
interface CacheHealth {
  isHealthy: boolean;
  globalHitRate: number;
  totalCaches: number;
  totalHits: number;
  totalMisses: number;
  lowHitRateCaches: string[];
  recommendations: string;
}

// 缓存管理页面
export default function CacheManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cacheStats, setCacheStats] = useState<CacheStats[]>([]);
  const [cacheHealth, setCacheHealth] = useState<CacheHealth | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // 获取缓存统计信息
  const fetchCacheStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system/cache');
      const data = await response.json();
      setCacheStats(data.stats || []);
    } catch (error) {
      toast({
        title: '获取缓存统计失败',
        description: '无法获取缓存统计信息，请稍后再试。',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 获取缓存健康状态
  const fetchCacheHealth = async () => {
    try {
      const response = await fetch('/api/system/cache?action=health');
      const data = await response.json();
      setCacheHealth(data);
    } catch (error) {
      toast({
        title: '获取缓存健康状态失败',
        description: '无法获取缓存健康状态，请稍后再试。',
        variant: 'destructive'
      });
    }
  };

  // 清空指定命名空间的缓存
  const clearNamespaceCache = async (namespace: string) => {
    try {
      setActionInProgress(namespace);
      const response = await fetch('/api/system/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'clear_namespace',
          namespace
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '缓存已清空',
          description: `${namespace} 缓存已成功清空。`,
        });
        
        // 刷新缓存统计
        await fetchCacheStats();
      } else {
        toast({
          title: '清空缓存失败',
          description: data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: '清空缓存失败',
        description: '发生错误，无法清空缓存。',
        variant: 'destructive'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // 清空所有缓存
  const clearAllCaches = async () => {
    try {
      setActionInProgress('all');
      const response = await fetch('/api/system/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'clear_all'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '所有缓存已清空',
          description: '所有缓存已成功清空。',
        });
        
        // 刷新缓存统计
        await fetchCacheStats();
      } else {
        toast({
          title: '清空缓存失败',
          description: data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: '清空缓存失败',
        description: '发生错误，无法清空所有缓存。',
        variant: 'destructive'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // 预热指定命名空间的缓存
  const reloadNamespaceCache = async (namespace: string) => {
    try {
      setActionInProgress(`reload-${namespace}`);
      const response = await fetch('/api/system/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'reload_namespace',
          namespace
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '缓存已预热',
          description: `${namespace} 缓存已成功预热。`,
        });
        
        // 刷新缓存统计
        await fetchCacheStats();
      } else {
        toast({
          title: '预热缓存失败',
          description: data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: '预热缓存失败',
        description: '发生错误，无法预热缓存。',
        variant: 'destructive'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // 预热所有缓存
  const preloadAllCaches = async () => {
    try {
      setActionInProgress('preload-all');
      const response = await fetch('/api/system/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'preload_all'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '所有缓存已预热',
          description: '所有缓存已成功预热。',
        });
        
        // 刷新缓存统计
        await fetchCacheStats();
      } else {
        toast({
          title: '预热缓存失败',
          description: data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: '预热缓存失败',
        description: '发生错误，无法预热所有缓存。',
        variant: 'destructive'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // 刷新所有数据
  const refreshAll = async () => {
    try {
      setRefreshing(true);
      await fetchCacheStats();
      await fetchCacheHealth();
    } finally {
      setRefreshing(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchCacheStats();
    fetchCacheHealth();
  }, []);

  // 格式化命中率为百分比
  const formatHitRate = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  // 获取命中率的状态颜色
  const getHitRateColor = (rate: number) => {
    if (rate >= 0.8) return 'bg-green-100 text-green-800';
    if (rate >= 0.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">缓存管理</h1>
          <p className="text-muted-foreground mt-1">
            监控和管理系统缓存性能
          </p>
        </div>
        <Button 
          onClick={refreshAll} 
          disabled={refreshing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          刷新数据
        </Button>
      </div>

      {/* 缓存健康状态卡片 */}
      {cacheHealth && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle>缓存健康状态</CardTitle>
              {cacheHealth.isHealthy ? (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  <CheckCircle className="h-4 w-4 mr-1" /> 健康
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  <AlertTriangle className="h-4 w-4 mr-1" /> 需优化
                </Badge>
              )}
            </div>
            <CardDescription>
              系统缓存总体健康状态和性能指标
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">全局命中率</div>
                <div className="text-2xl font-bold mt-1">
                  {formatHitRate(cacheHealth.globalHitRate)}
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">总缓存命中次数</div>
                <div className="text-2xl font-bold mt-1">
                  {cacheHealth.totalHits.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">总缓存未命中</div>
                <div className="text-2xl font-bold mt-1">
                  {cacheHealth.totalMisses.toLocaleString()}
                </div>
              </div>
            </div>
            
            {cacheHealth.lowHitRateCaches.length > 0 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <Info className="h-5 w-5 text-yellow-500 mr-2" />
                  <div>
                    <p className="font-medium">优化建议</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {cacheHealth.recommendations}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="flex space-x-2">
              <Button 
                onClick={preloadAllCaches} 
                variant="outline" 
                className="gap-2"
                disabled={actionInProgress === 'preload-all'}
              >
                {actionInProgress === 'preload-all' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                预热所有缓存
              </Button>
              <Button 
                onClick={clearAllCaches} 
                variant="destructive" 
                className="gap-2"
                disabled={actionInProgress === 'all'}
              >
                {actionInProgress === 'all' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                清空所有缓存
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* 缓存详情表格 */}
      <Card>
        <CardHeader>
          <CardTitle>缓存详情</CardTitle>
          <CardDescription>
            各命名空间缓存的使用情况和性能指标
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">加载缓存数据...</p>
            </div>
          ) : cacheStats.length === 0 ? (
            <div className="py-10 text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">无缓存数据或缓存服务未初始化</p>
              <Button 
                onClick={preloadAllCaches} 
                className="mt-4"
                disabled={actionInProgress === 'preload-all'}
              >
                {actionInProgress === 'preload-all' ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                初始化并预热缓存
              </Button>
            </div>
          ) : (
            <Table>
              <TableCaption>系统缓存性能指标列表</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>命名空间</TableHead>
                  <TableHead className="text-right">项目数</TableHead>
                  <TableHead className="text-right">命中次数</TableHead>
                  <TableHead className="text-right">未命中</TableHead>
                  <TableHead className="text-right">命中率</TableHead>
                  <TableHead className="text-right">已过期</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cacheStats.map((stat) => (
                  <TableRow key={stat.namespace}>
                    <TableCell className="font-medium">{stat.namespace}</TableCell>
                    <TableCell className="text-right">{stat.size}/{stat.capacity}</TableCell>
                    <TableCell className="text-right">{stat.hits}</TableCell>
                    <TableCell className="text-right">{stat.misses}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={getHitRateColor(stat.hitRate)}>
                        {formatHitRate(stat.hitRate)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{stat.expired}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionInProgress === `reload-${stat.namespace}`}
                          onClick={() => reloadNamespaceCache(stat.namespace)}
                          className="h-8 px-2"
                        >
                          {actionInProgress === `reload-${stat.namespace}` ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionInProgress === stat.namespace}
                          onClick={() => clearNamespaceCache(stat.namespace)}
                          className="h-8 px-2"
                        >
                          {actionInProgress === stat.namespace ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 