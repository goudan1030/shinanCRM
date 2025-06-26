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
        // 获取总会员数
        const response = await fetch('/api/dashboard/members/count');
        const data = await response.json();
        if (!response.ok) {
          throw new Error('Failed to fetch total members');
        }
        const totalMembers = data.count;

        // 获取当月收入
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const incomeResponse = await fetch('/api/dashboard/income/monthly');
        const incomeData = await incomeResponse.json();
        if (!incomeResponse.ok) {
          throw new Error('Failed to fetch monthly income');
        }
        const monthlyIncome = incomeData.amount;

        // 获取当月支出 - 通过API从MySQL获取
        const expenseResponse = await fetch('/api/dashboard/expense/monthly');
        if (!expenseResponse.ok) {
          throw new Error('Failed to fetch monthly expense');
        }
        const expenseData = await expenseResponse.json();
        const monthlyExpense = expenseData.amount || 0;
        
        console.log('从API获取的当月支出:', monthlyExpense);

        // 获取当月已结算金额 - 通过API从MySQL获取
        const settlementResponse = await fetch('/api/dashboard/settlement/monthly');
        if (!settlementResponse.ok) {
          throw new Error('Failed to fetch monthly settlement amount');
        }
        const settlementData = await settlementResponse.json();
        const settledAmount = settlementData.amount || 0;
        
        console.log('从API获取的已结算金额:', settledAmount);

        // 获取当月通过WECHAT_ZHANG支付的金额 - 通过API从MySQL获取
        const wechatZhangResponse = await fetch('/api/dashboard/income/wechat-zhang');
        if (!wechatZhangResponse.ok) {
          throw new Error('Failed to fetch WECHAT_ZHANG payment amount');
        }
        const wechatZhangData = await wechatZhangResponse.json();
        const wechatZhangAmount = wechatZhangData.amount || 0;
        
        console.log('从API获取的微信张支付金额:', wechatZhangAmount);

        // 计算待结算金额：当月总收入减去当月总支出之后，然后除以2，再减去当月已结算金额
        const unsettledAmount = (monthlyIncome - monthlyExpense) / 2 - settledAmount;

        // 以更清晰的方式显示计算逻辑
        console.log('当月收入:', monthlyIncome);
        console.log('当月支出:', monthlyExpense);
        console.log('当月营业额一半(预计可结算):', (monthlyIncome - monthlyExpense) / 2);
        console.log('当月已结算金额:', settledAmount);
        console.log('当月待结算金额:', unsettledAmount);

        // 获取趋势数据
        const trendsResponse = await fetch('/api/dashboard/trends');
        const trendsData = await trendsResponse.json();
        if (!trendsResponse.ok) {
          throw new Error('Failed to fetch trends data');
        }

        setDashboardData({
          totalMembers: totalMembers || 0,
          monthlyIncome,
          monthlyExpense,
          settledAmount,
          unsettledAmount,
          memberTrend: trendsData.memberTrend,
          incomeTrend: trendsData.incomeTrend
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
    <div className="flex flex-col h-full p-4 lg:p-6 space-y-6 lg:space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl lg:text-2xl font-bold tracking-tight">仪表盘</h1>
      </div>
      
      {/* 数据卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="text-sm lg:text-base font-medium text-muted-foreground">总会员数</CardTitle>
            <CardDescription className="text-2xl lg:text-4xl font-bold text-foreground">{dashboardData.totalMembers}</CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="text-sm lg:text-base font-medium text-muted-foreground">当月收入</CardTitle>
            <CardDescription className="text-2xl lg:text-4xl font-bold text-foreground">¥{dashboardData.monthlyIncome.toLocaleString()}</CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="text-sm lg:text-base font-medium text-muted-foreground">当月已结算金额</CardTitle>
            <CardDescription className="text-2xl lg:text-4xl font-bold text-foreground">¥{dashboardData.settledAmount.toLocaleString()}</CardDescription>
          </CardHeader>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200 ring-1 ring-blue-100 hover:ring-blue-200"
          onClick={handleUnsettledCardClick}
        >
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="text-sm lg:text-base font-medium text-muted-foreground">当月待结算金额</CardTitle>
            <CardDescription className="text-2xl lg:text-4xl font-bold text-foreground">¥{dashboardData.unsettledAmount.toLocaleString()}</CardDescription>
            <p className="text-xs text-muted-foreground">点击查看结算详情或进行结算</p>
          </CardHeader>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6 flex-1 min-h-0">
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base lg:text-lg font-medium text-muted-foreground">会员增长趋势</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <div className="h-full min-h-[200px] lg:min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.memberTrend} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs text-muted-foreground" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  />
                  <YAxis 
                    className="text-xs text-muted-foreground" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      boxShadow: 'var(--shadow)',
                      fontSize: '14px'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    className="fill-primary"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base lg:text-lg font-medium text-muted-foreground">收入趋势</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <div className="h-full min-h-[200px] lg:min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.incomeTrend} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs text-muted-foreground" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  />
                  <YAxis 
                    className="text-xs text-muted-foreground" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      boxShadow: 'var(--shadow)',
                      fontSize: '14px'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    className="fill-green-500"
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