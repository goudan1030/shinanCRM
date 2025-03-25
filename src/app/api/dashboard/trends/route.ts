import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function GET(request: Request) {
  try {
    // 获取当前日期和30天前的日期
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // 手动格式化日期，避免时区问题
    const nowStr = now.toISOString().split('T')[0];
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    console.log('趋势数据API查询范围:', thirtyDaysAgoStr, '至', nowStr);

    // 获取会员增长趋势
    const [memberTrend] = await pool.execute(
      `SELECT 
        DATE_FORMAT(created_at, '%m月%d日') as date,
        COUNT(*) as value
      FROM members
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)`,
      [thirtyDaysAgoStr, nowStr]
    );

    // 获取收入趋势 - 使用payment_date作为统计依据
    const [incomeTrend] = await pool.execute(
      `SELECT 
        DATE_FORMAT(payment_date, '%m月%d日') as date,
        COALESCE(SUM(amount), 0) as value
      FROM income_records
      WHERE payment_date >= ? AND payment_date <= ?
      GROUP BY payment_date
      ORDER BY payment_date`,
      [thirtyDaysAgoStr, nowStr]
    );

    // 填充没有数据的日期
    const trends = new Map();
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
      trends.set(dateStr, {
        month: dateStr,
        memberValue: 0,
        incomeValue: 0
      });
    }

    // 更新实际数据
    memberTrend.forEach((item: any) => {
      if (trends.has(item.date)) {
        trends.get(item.date).memberValue = Number(item.value);
      }
    });

    incomeTrend.forEach((item: any) => {
      if (trends.has(item.date)) {
        trends.get(item.date).incomeValue = Number(item.value);
      }
    });

    // 转换为数组并按日期排序
    const result = Array.from(trends.values()).reverse();

    return NextResponse.json({
      memberTrend: result.map(item => ({ month: item.month, value: item.memberValue })),
      incomeTrend: result.map(item => ({ month: item.month, value: item.incomeValue }))
    });
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    return NextResponse.json(
      { error: '获取趋势数据失败' },
      { status: 500 }
    );
  }
}