import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    console.log('微信张支付API查询范围:', firstDayOfMonth, '至', lastDayOfMonth);

    // 查询当月通过WECHAT_ZHANG支付的金额
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT SUM(amount) as total FROM income_records WHERE payment_method = ? AND DATE(created_at) >= ? AND DATE(created_at) <= ?',
      ['WECHAT_ZHANG', firstDayOfMonth, lastDayOfMonth]
    );

    console.log('微信张支付API查询结果:', rows);

    // 安全地处理结果
    const total = rows && rows[0] && rows[0].total ? Number(rows[0].total) : 0;

    return NextResponse.json({ amount: total });
  } catch (error) {
    console.error('获取当月微信张支付金额失败:', error);
    return NextResponse.json(
      { error: '获取当月微信张支付金额失败' },
      { status: 500 }
    );
  }
} 