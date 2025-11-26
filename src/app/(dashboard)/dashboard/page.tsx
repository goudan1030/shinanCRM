'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendData {
  month: string;
  value: number;
}

interface DashboardData {
  totalMembers: number;
  monthlyIncome: number;
  monthlyExpense: number;
  settledAmount: number;
  unsettledAmount: number;
  memberTrend: TrendData[];
  incomeTrend: TrendData[];
}

export default function DashboardPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalMembers: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
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
        setLoading(true);
        
        // 并行请求所有数据，大幅提升加载速度
        const [
          membersResponse,
          incomeResponse,
          expenseResponse,
          settlementResponse,
          wechatZhangResponse,
          trendsResponse
        ] = await Promise.all([
          fetch('/api/dashboard/members/count'),
          fetch('/api/dashboard/income/monthly'),
          fetch('/api/dashboard/expense/monthly'),
          fetch('/api/dashboard/settlement/monthly'),
          fetch('/api/dashboard/income/wechat-zhang'),
          fetch('/api/dashboard/trends')
        ]);

        // 并行解析所有响应
        const [
          membersData,
          incomeData,
          expenseData,
          settlementData,
          wechatZhangData,
          trendsData
        ] = await Promise.all([
          membersResponse.json(),
          incomeResponse.json(),
          expenseResponse.json(),
          settlementResponse.json(),
          wechatZhangResponse.json(),
          trendsResponse.json()
        ]);

        // 检查响应状态并提取数据
        const totalMembers = membersResponse.ok && membersData.count ? membersData.count : 0;
        const monthlyIncome = incomeResponse.ok && incomeData.amount ? incomeData.amount : 0;
        const monthlyExpense = expenseResponse.ok && expenseData.amount ? expenseData.amount : 0;
        const settledAmount = settlementResponse.ok && settlementData.amount ? settlementData.amount : 0;
        const wechatZhangAmount = wechatZhangResponse.ok && wechatZhangData.amount ? wechatZhangData.amount : 0;

        // 计算待结算金额：当月总收入减去当月总支出之后，然后除以2，再减去当月已结算金额
        const unsettledAmount = (monthlyIncome - monthlyExpense) / 2 - settledAmount;

        setDashboardData({
          totalMembers,
          monthlyIncome,
          monthlyExpense,
          settledAmount,
          unsettledAmount,
          memberTrend: trendsResponse.ok && trendsData.memberTrend ? trendsData.memberTrend : [],
          incomeTrend: trendsResponse.ok && trendsData.incomeTrend ? trendsData.incomeTrend : []
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
  }, [session]);

  // 处理"当月待结算金额"卡片点击事件
  const handleUnsettledCardClick = () => {
    router.push('/finance/settlement');
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
      
      {/* 数据卡片网格 - 手机端单列，平板端双列 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        <Card>
          <CardHeader className="space-y-1 sm:space-y-2 p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground">总会员数</CardTitle>
            <CardDescription className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">{dashboardData.totalMembers}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1 sm:space-y-2 p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground">当月收入</CardTitle>
            <CardDescription className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">¥{dashboardData.monthlyIncome.toLocaleString()}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1 sm:space-y-2 p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground">当月已结算金额</CardTitle>
            <CardDescription className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">¥{dashboardData.settledAmount.toLocaleString()}</CardDescription>
          </CardHeader>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow duration-200"
          onClick={handleUnsettledCardClick}
        >
          <CardHeader className="space-y-1 sm:space-y-2 p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground">当月待结算金额</CardTitle>
            <CardDescription className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">¥{dashboardData.unsettledAmount.toLocaleString()}</CardDescription>
            <p className="text-xs text-muted-foreground mt-1">点击查看结算详情或进行结算</p>
          </CardHeader>
        </Card>
      </div>

      {/* 图表区域 - 手机端单列，大屏双列 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2 p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground">会员增长趋势</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="h-[200px] sm:h-[250px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.memberTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs text-muted-foreground" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    className="text-xs text-muted-foreground" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      boxShadow: 'var(--shadow)',
                      color: 'hsl(var(--foreground))',
                      padding: '8px',
                      fontSize: '12px'
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
          <CardHeader className="pb-2 p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground">收入趋势</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="h-[200px] sm:h-[250px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.incomeTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs text-muted-foreground" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    className="text-xs text-muted-foreground" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      boxShadow: 'var(--shadow)',
                      color: 'hsl(var(--foreground))',
                      padding: '8px',
                      fontSize: '12px'
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