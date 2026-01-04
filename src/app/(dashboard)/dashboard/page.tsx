'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface DailyTaskMember {
  id: number;
  member_no: string;
  nickname: string;
  wechat: string;
  phone: string;
  birth_year: number;
  height: number;
  weight: number;
  education: string;
  occupation: string;
  province: string;
  city: string;
  district: string;
  target_area: string;
  house_car: string;
  hukou_province: string;
  hukou_city: string;
  children_plan: string;
  marriage_cert: string;
  marriage_history: string;
  sexual_orientation: string;
  self_description: string;
  partner_requirement: string;
}

export default function DashboardPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [inactiveUsers, setInactiveUsers] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  // 每日任务相关状态
  const [currentMember, setCurrentMember] = useState<DailyTaskMember | null>(null);
  const [taskStatus, setTaskStatus] = useState<{
    isCompleted: boolean;
    publishedCount: number;
    totalCount: number;
  } | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        // 并行请求所有数据
        const [membersResponse, usersResponse, inactiveResponse] = await Promise.all([
          fetch('/api/dashboard/members/count'),
          fetch('/api/dashboard/users/count'),
          fetch('/api/dashboard/users/inactive')
        ]);

        const [membersData, usersData, inactiveData] = await Promise.all([
          membersResponse.json(),
          usersResponse.json(),
          inactiveResponse.json()
        ]);

        setTotalMembers(membersResponse.ok && membersData.count ? membersData.count : 0);
        setTotalUsers(usersResponse.ok && usersData.count ? usersData.count : 0);
        setInactiveUsers(inactiveResponse.ok && inactiveData.count ? inactiveData.count : 0);
      } catch (error) {
        console.error('获取仪表盘数据失败:', error);
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchDashboardData();
      fetchDailyTaskStatus();
      fetchNextMember();
    }
  }, [session]);

  // 获取每日任务状态
  const fetchDailyTaskStatus = async () => {
    try {
      const response = await fetch('/api/dashboard/daily-task/status');
      const data = await response.json();
      if (response.ok && data.success) {
        setTaskStatus(data.data);
      }
    } catch (error) {
      console.error('获取任务状态失败:', error);
    }
  };

  // 获取下一个要发布的女生
  const fetchNextMember = async () => {
    try {
      setTaskLoading(true);
      const response = await fetch('/api/dashboard/daily-task/next');
      const data = await response.json();
      if (response.ok && data.success) {
        setCurrentMember(data.data.member);
        setTaskStatus(prev => prev ? {
          ...prev,
          publishedCount: data.data.publishedCount,
          totalCount: data.data.totalCount
        } : null);
      } else {
        setCurrentMember(null);
      }
    } catch (error) {
      console.error('获取下一个女生失败:', error);
    } finally {
      setTaskLoading(false);
    }
  };

  // 标记已发布
  const handlePublish = async () => {
    if (!currentMember) return;

    try {
      setTaskLoading(true);
      const response = await fetch('/api/dashboard/daily-task/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId: currentMember.id }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: '发布成功',
          description: `已标记 ${currentMember.member_no} 为已发布`,
        });
        await fetchDailyTaskStatus();
        await fetchNextMember();
      } else {
        toast({
          variant: 'destructive',
          title: '发布失败',
          description: data.error || '标记发布失败',
        });
      }
    } catch (error) {
      console.error('标记发布失败:', error);
      toast({
        variant: 'destructive',
        title: '发布失败',
        description: '网络错误，请重试',
      });
    } finally {
      setTaskLoading(false);
    }
  };

  // 完成今日任务
  const handleComplete = async () => {
    try {
      setTaskLoading(true);
      const response = await fetch('/api/dashboard/daily-task/complete', {
        method: 'POST',
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: '任务完成',
          description: `今日已发布 ${data.data.totalPublished} 个女生信息`,
        });
        await fetchDailyTaskStatus();
        setCurrentMember(null);
      } else {
        toast({
          variant: 'destructive',
          title: '完成失败',
          description: data.error || '标记完成失败',
        });
      }
    } catch (error) {
      console.error('标记完成失败:', error);
      toast({
        variant: 'destructive',
        title: '完成失败',
        description: '网络错误，请重试',
      });
    } finally {
      setTaskLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 lg:space-y-8">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">仪表盘</h1>
      
      {/* 数据卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <Card>
          <CardHeader className="space-y-1 sm:space-y-2 p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground">总会员数</CardTitle>
            <CardDescription className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">{totalMembers}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1 sm:space-y-2 p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground">用户数</CardTitle>
            <CardDescription className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">{totalUsers}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1 sm:space-y-2 p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground">未激活数量</CardTitle>
            <CardDescription className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">{inactiveUsers}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* 每日任务卡片 */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg font-semibold">每日任务</CardTitle>
          <CardDescription>
            {taskStatus && (
              <span>
                今日已发布: {taskStatus.publishedCount} / {taskStatus.totalCount}
                {taskStatus.isCompleted && (
                  <span className="ml-2 text-green-600 font-medium">✓ 已完成</span>
                )}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {taskStatus?.isCompleted ? (
            <div className="text-center py-8">
              <p className="text-lg text-muted-foreground mb-4">今日任务已完成！</p>
              <p className="text-sm text-muted-foreground">
                今日共发布 {taskStatus.publishedCount} 个女生信息
              </p>
            </div>
          ) : currentMember ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">会员编号:</span>
                  <span className="text-sm">{currentMember.member_no}</span>
                </div>
                {currentMember.nickname && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">昵称:</span>
                    <span className="text-sm">{currentMember.nickname}</span>
                  </div>
                )}
                {currentMember.birth_year && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">出生年份:</span>
                    <span className="text-sm">{currentMember.birth_year}年</span>
                  </div>
                )}
                {currentMember.height && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">身高:</span>
                    <span className="text-sm">{currentMember.height}cm</span>
                  </div>
                )}
                {currentMember.weight && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">体重:</span>
                    <span className="text-sm">{currentMember.weight}kg</span>
                  </div>
                )}
                {currentMember.city && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">所在地:</span>
                    <span className="text-sm">
                      {currentMember.province || ''}{currentMember.city || ''}{currentMember.district || ''}
                    </span>
                  </div>
                )}
                {currentMember.education && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">学历:</span>
                    <span className="text-sm">{currentMember.education}</span>
                  </div>
                )}
                {currentMember.occupation && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">职业:</span>
                    <span className="text-sm">{currentMember.occupation}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handlePublish} 
                  disabled={taskLoading}
                  className="flex-1"
                >
                  {taskLoading ? '处理中...' : '已发布'}
                </Button>
                <Button 
                  onClick={handleComplete} 
                  disabled={taskLoading || (taskStatus && taskStatus.publishedCount === 0)}
                  variant="outline"
                  className="flex-1"
                >
                  完成今日任务
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {taskLoading ? '加载中...' : '暂无可发布的女生信息'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}