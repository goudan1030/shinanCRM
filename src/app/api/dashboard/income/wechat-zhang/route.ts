import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { RowDataPacket } from 'mysql2';

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

    console.log('微信张支付API查询范围(UTC修正):', firstDayStr, '至', lastDayStr);

    // 查询当月通过WECHAT_ZHANG支付的金额，使用支付日期payment_date
    const [rows] = await executeQuery<RowDataPacket[]>(
      `SELECT SUM(amount) as total FROM income_records 
       WHERE payment_method = 'WECHAT_ZHANG'
       AND payment_date >= ? AND payment_date <= ?`,
      [firstDayStr, lastDayStr]
    );

    console.log('微信张支付API查询结果:', rows);

    // 安全地处理结果
    const total = rows && rows[0] && rows[0].total ? Number(rows[0].total) : 0;

    return NextResponse.json({ amount: total });
  } catch (error) {
    console.error('获取当月微信张支付金额失败:', error);
    return NextResponse.json(
      { success: false, error: '获取当月微信张支付金额失败' },
      { status: 500 }
    );
  }
} 