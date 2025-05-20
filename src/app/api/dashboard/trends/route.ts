import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function GET(request: Request) {
  try {
    // 获取当前日期和30天前的日期
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // 使用UTC日期，避免时区问题
    const nowStr = formatYYYYMMDD(now);
    const thirtyDaysAgoStr = formatYYYYMMDD(thirtyDaysAgo);
    
    console.log('趋势数据API查询范围:', thirtyDaysAgoStr, '至', nowStr);

    // 获取会员增长趋势 - 修改为使用 BETWEEN 来更准确匹配日期
    const [memberTrend] = await pool.execute(
      `SELECT 
        DATE_FORMAT(created_at, '%m月%d日') as date, 
        COUNT(*) as value
      FROM members
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at), DATE_FORMAT(created_at, '%m月%d日')
      ORDER BY DATE(created_at)`,
      [thirtyDaysAgoStr, nowStr]
    );

    console.log('会员趋势原始数据:', JSON.stringify(memberTrend));

    // 获取收入趋势 - 修改为更可靠的日期处理方式
    const [incomeTrend] = await pool.execute(
      `SELECT 
        DATE_FORMAT(payment_date, '%m月%d日') as date,
        COALESCE(SUM(amount), 0) as value
      FROM income_records
      WHERE DATE(payment_date) BETWEEN ? AND ?
      GROUP BY DATE(payment_date), DATE_FORMAT(payment_date, '%m月%d日')
      ORDER BY DATE(payment_date)`,
      [thirtyDaysAgoStr, nowStr]
    );

    console.log('收入趋势原始数据:', JSON.stringify(incomeTrend));

    // 填充没有数据的日期 - 使用更可靠的生成方法
    const trends = generateDateMap(now, 30);
    
    console.log('生成的日期映射:', Array.from(trends.keys()).slice(0, 5));

    // 更新实际数据
    if (Array.isArray(memberTrend)) {
      memberTrend.forEach((item: any) => {
        if (trends.has(item.date)) {
          trends.get(item.date).memberValue = Number(item.value);
        } else {
          console.log(`日期不匹配(会员趋势): ${item.date}`);
        }
      });
    }

    if (Array.isArray(incomeTrend)) {
      incomeTrend.forEach((item: any) => {
        if (trends.has(item.date)) {
          trends.get(item.date).incomeValue = Number(item.value);
        } else {
          console.log(`日期不匹配(收入趋势): ${item.date}`);
        }
      });
    }

    // 转换为数组并按日期排序
    const result = Array.from(trends.values()).reverse();
    
    console.log('最终处理的趋势数据样本:', result.slice(0, 3));

    const response = {
      memberTrend: result.map(item => ({ month: item.month, value: item.memberValue })),
      incomeTrend: result.map(item => ({ month: item.month, value: item.incomeValue }))
    };
    
    // 添加成功响应日志
    console.log('趋势API响应数据示例:', {
      memberTrend: response.memberTrend.slice(0, 3),
      incomeTrend: response.incomeTrend.slice(0, 3)
    });
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    return NextResponse.json(
      { error: '获取趋势数据失败' },
      { status: 500 }
    );
  }
}

// 辅助函数：格式化日期为YYYY-MM-DD格式
function formatYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 辅助函数：生成过去n天的日期映射
function generateDateMap(now: Date, days: number): Map<string, any> {
  const trends = new Map();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 格式化为"MM月DD日"，与SQL查询结果一致
    const dateStr = `${month}月${day}日`;
    
    trends.set(dateStr, {
      month: dateStr,
      memberValue: 0,
      incomeValue: 0,
      // 添加原始日期，便于调试
      rawDate: formatYYYYMMDD(date)
    });
  }
  
  return trends;
}