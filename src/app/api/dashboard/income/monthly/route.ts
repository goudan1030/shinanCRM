import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function GET() {
  try {
    // 获取当前日期，手动构建日期字符串避免时区问题
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // 当月第一天
    const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    
    // 当月最后一天
    const lastDay = new Date(year, month + 1, 0);
    const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    console.log('当月收入API查询范围(UTC修正):', firstDayStr, '至', lastDayStr);

    // 查询当月收入总额 - 按照支付日期(payment_date)统计
    const [result] = await pool.execute(
      'SELECT SUM(amount) as total FROM income_records WHERE payment_date >= ? AND payment_date <= ?',
      [firstDayStr, lastDayStr]
    );

    console.log('当月收入API查询结果:', result);

    return NextResponse.json({ amount: result[0].total || 0 });
  } catch (error) {
    console.error('获取当月收入失败:', error);
    return NextResponse.json(
      { error: '获取当月收入失败' },
      { status: 500 }
    );
  }
}