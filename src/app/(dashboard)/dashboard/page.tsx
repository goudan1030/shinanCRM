'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function DashboardPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [inactiveUsers, setInactiveUsers] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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
    }
  }, [session]);

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
    </div>
  );
}