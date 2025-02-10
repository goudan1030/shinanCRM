'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function DashboardPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [dashboardData, setDashboardData] = useState({
    totalMembers: 0,
    monthlyIncome: 0,
    settledAmount: 0,
    unsettledAmount: 0,
    memberTrend: [],
    incomeTrend: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // 获取总会员数
        const { count: totalMembers } = await supabase
          .from('members')
          .select('*', { count: 'exact' });

        // 获取当月收入
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const { data: monthlyIncomeData } = await supabase
          .from('income_records')
          .select('amount')
          .gte('created_at', firstDayOfMonth.toISOString())
          .lte('created_at', lastDayOfMonth.toISOString());

        const monthlyIncome = monthlyIncomeData?.reduce((sum, record) => sum + record.amount, 0) || 0;

        // 获取当月已结算金额
        const { data: settledData } = await supabase
          .from('settlement_records')
          .select('amount')
          .gte('created_at', firstDayOfMonth.toISOString())
          .lte('created_at', lastDayOfMonth.toISOString());

        const settledAmount = settledData?.reduce((sum, record) => sum + record.amount, 0) || 0;

        // 获取当月通过WECHAT_ZHANG支付的金额
        const { data: wechatZhangData } = await supabase
          .from('income_records')
          .select('amount')
          .eq('payment_method', 'WECHAT_ZHANG')
          .gte('created_at', firstDayOfMonth.toISOString())
          .lte('created_at', lastDayOfMonth.toISOString());

        const wechatZhangAmount = wechatZhangData?.reduce((sum, record) => sum + record.amount, 0) || 0;

        // 计算待结算金额：本月收入/2 - 已结算金额 - WECHAT_ZHANG支付金额
        const unsettledAmount = (monthlyIncome / 2) - settledAmount - wechatZhangAmount;

        // 获取最近30天的每日新增用户数量
        const memberTrend = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

          const { data: dailyMembers } = await supabase
            .from('members')
            .select('created_at')
            .gte('created_at', startOfDay.toISOString())
            .lte('created_at', endOfDay.toISOString());

          memberTrend.push({
            month: `${date.getMonth() + 1}月${date.getDate()}日`,
            value: dailyMembers?.length || 0
          });
        }

        // 获取最近30天的每日收入
        const incomeTrend = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

          const { data: incomeData } = await supabase
            .from('income_records')
            .select('amount')
            .gte('created_at', startOfDay.toISOString())
            .lte('created_at', endOfDay.toISOString());

          const dailyTotal = incomeData?.reduce((sum, record) => sum + record.amount, 0) || 0;

          incomeTrend.push({
            month: `${date.getMonth() + 1}月${date.getDate()}日`,
            value: dailyTotal
          });
        }

        setDashboardData({
          totalMembers: totalMembers || 0,
          monthlyIncome,
          settledAmount,
          unsettledAmount,
          memberTrend,
          incomeTrend
        });
      } catch (error) {
        console.error('获取仪表盘数据失败:', error);
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchDashboardData();
    }
  }, [session, supabase]);

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen p-6 space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">仪表盘</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-base font-medium text-muted-foreground">总会员数</CardTitle>
            <CardDescription className="text-4xl font-bold text-foreground">{dashboardData.totalMembers}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-base font-medium text-muted-foreground">当月收入</CardTitle>
            <CardDescription className="text-4xl font-bold text-foreground">¥{dashboardData.monthlyIncome.toLocaleString()}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-base font-medium text-muted-foreground">已结算金额</CardTitle>
            <CardDescription className="text-4xl font-bold text-foreground">¥{dashboardData.settledAmount.toLocaleString()}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-base font-medium text-muted-foreground">待结算金额</CardTitle>
            <CardDescription className="text-4xl font-bold text-foreground">¥{dashboardData.unsettledAmount.toLocaleString()}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">会员增长趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.memberTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                  <XAxis dataKey="month" className="text-xs text-muted-foreground" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs text-muted-foreground" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      boxShadow: 'var(--shadow)',
                      color: 'hsl(var(--foreground))',
                      padding: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                  />
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">收入趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.incomeTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                  <XAxis dataKey="month" className="text-xs text-muted-foreground" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs text-muted-foreground" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      boxShadow: 'var(--shadow)',
                      color: 'hsl(var(--foreground))',
                      padding: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                  />
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}