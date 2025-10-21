'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useState, useEffect } from 'react';
import { RefreshCw, User, Phone, MapPin, Calendar, Eye, Clock, Users, Info } from 'lucide-react';

interface RefreshedMember {
  id: string;
  member_no: string;
  nickname: string;
  gender: string;
  birth_year: number;
  phone: string;
  wechat: string;
  province: string;
  city: string;
  district: string;
  type: string;
  status: string;
  updated_at: string;
  created_at: string;
}

export default function AppRefreshPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshedMembers, setRefreshedMembers] = useState<RefreshedMember[]>([]);
  const [totalRefreshed, setTotalRefreshed] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [updateTimeRange, setUpdateTimeRange] = useState<{start: string, end: string} | null>(null);

  // 获取今日刷新的会员列表
  const fetchRefreshedMembers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/app/refresh/list');
      const data = await response.json();

      if (data.success) {
        setRefreshedMembers(data.data);
        setTotalRefreshed(data.total);
        if (data.data.length > 0) {
          setLastUpdateTime(data.data[0].updated_at);
        }
      } else {
        toast({
          variant: 'destructive',
          title: '获取失败',
          description: data.error || '获取刷新会员列表失败'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '获取失败',
        description: '网络错误，请重试'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 执行今日刷新
  const performTodayRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/app/refresh/today', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '刷新成功',
          description: data.message || `已成功刷新 ${data.count} 位会员的更新时间（4小时内随机分布）`
        });
        
        // 保存时间范围信息
        if (data.data?.updateTimeRange) {
          setUpdateTimeRange(data.data.updateTimeRange);
        }
        
        // 刷新列表
        fetchRefreshedMembers();
      } else {
        toast({
          variant: 'destructive',
          title: '刷新失败',
          description: data.error || '执行今日刷新失败'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '刷新失败',
        description: '网络错误，请重试'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // 计算年龄
  const calculateAge = (birthYear: number) => {
    return new Date().getFullYear() - birthYear;
  };

  // 格式化性别
  const formatGender = (gender: string) => {
    return gender === 'male' ? '男' : gender === 'female' ? '女' : '未知';
  };

  // 格式化会员类型
  const formatType = (type: string) => {
    const typeMap: Record<string, string> = {
      'NORMAL': '普通会员',
      'ONE_TIME': '一次性会员',
      'ANNUAL': '年费会员'
    };
    return typeMap[type] || type;
  };

  // 格式化状态
  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'ACTIVE': '活跃',
      'INACTIVE': '非活跃',
      'REVOKED': '已撤销',
      'SUCCESS': '成功'
    };
    return statusMap[status] || status;
  };

  // 格式化时间
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return '刚刚';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}分钟前`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}小时前`;
    } else {
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // 格式化时间范围
  const formatTimeRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    return {
      start: startDate.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      end: endDate.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  // 检查是否是今天刷新的（基于更新时间）
  const isTodayUpdate = (updateTime: string) => {
    const refreshDate = new Date(updateTime);
    const today = new Date();
    return refreshDate.toDateString() === today.toDateString();
  };

  useEffect(() => {
    fetchRefreshedMembers();
  }, []);

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* 页面头部 - 移动端优化 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">APP刷新管理</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            管理移动端应用的会员刷新策略，每次刷新将随机选择100名用户并分配4小时内随机的更新时间
          </p>
        </div>
        <Button 
          onClick={performTodayRefresh}
          disabled={isRefreshing}
          className="w-full sm:w-auto"
          size="sm"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? '刷新中...' : '今日刷新'}
        </Button>
      </div>

      {/* 刷新说明卡片 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900">刷新策略说明</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• 每次点击"今日刷新"将随机选择100名活跃会员</p>
                <p>• 每个会员的更新时间将在过去4小时内随机分配</p>
                <p>• 这样可以模拟真实的用户活跃时间分布</p>
                <p>• 避免所有用户同时刷新造成的服务器压力</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 刷新统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">今日刷新</p>
                <p className="text-2xl font-bold">{totalRefreshed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">最后更新时间</p>
                <p className="text-sm font-bold">
                  {lastUpdateTime ? formatTime(lastUpdateTime) : '暂无'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">刷新状态</p>
                <p className="text-sm font-bold">
                  {lastUpdateTime && isTodayUpdate(lastUpdateTime) ? '已刷新' : '未刷新'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">时间范围</p>
                <p className="text-xs font-bold">
                  {updateTimeRange ? 
                    `${formatTimeRange(updateTimeRange.start, updateTimeRange.end).start} - ${formatTimeRange(updateTimeRange.start, updateTimeRange.end).end}` : 
                    '4小时内随机'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 刷新会员列表 */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">今日刷新列表</CardTitle>
          <CardDescription className="text-sm">
            显示今日已刷新的会员列表，每个会员的更新时间在4小时内随机分布
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">加载中...</p>
            </div>
          ) : refreshedMembers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">今日暂无更新时间记录</p>
              <Button 
                variant="outline" 
                className="mt-4 w-full sm:w-auto"
                size="sm"
                onClick={performTodayRefresh}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                开始今日刷新
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {refreshedMembers.map((member) => (
                <div key={member.id} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                  {/* 移动端优化的会员卡片布局 */}
                  <div className="space-y-3">
                    {/* 头部信息 - 移动端垂直布局 */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
                      <div className="flex-1">
                        {/* 基本信息行 */}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
                          <h3 className="font-semibold text-base sm:text-lg">{member.nickname || '未设置昵称'}</h3>
                          <Badge variant="outline" className="text-xs">{member.member_no}</Badge>
                          <Badge variant={member.gender === 'male' ? 'default' : 'secondary'} className="text-xs">
                            {formatGender(member.gender)}
                          </Badge>
                          {member.birth_year && (
                            <Badge variant="outline" className="text-xs">{calculateAge(member.birth_year)}岁</Badge>
                          )}
                        </div>
                        
                        {/* 会员类型和状态 - 移动端单独一行 */}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">{formatType(member.type)}</Badge>
                          <Badge variant={member.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                            {formatStatus(member.status)}
                          </Badge>
                          <Badge variant="default" className="text-xs bg-green-600">
                            {formatTime(member.updated_at)}
                          </Badge>
                        </div>
                      </div>

                      {/* 操作按钮 - 移动端水平排列 */}
                      <div className="flex items-center justify-end space-x-2 sm:ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/members/${member.id}`, '_blank')}
                          className="flex-1 sm:flex-none"
                        >
                          <Eye className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">查看</span>
                        </Button>
                      </div>
                    </div>
                    
                    {/* 联系信息 - 移动端垂直布局 */}
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{member.phone || '未设置'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{member.wechat || '未设置'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{member.province} {member.city} {member.district}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span>注册于 {new Date(member.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
