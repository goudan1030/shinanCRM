import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function GET() {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10) + ' 00:00:00';
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10) + ' 23:59:59';

    // 查询当月已结算总额
    const [result] = await pool.execute(
      'SELECT SUM(amount) as total FROM settlement_records WHERE created_at >= ? AND created_at <= ?',
      [firstDayOfMonth, lastDayOfMonth]
    );

    return NextResponse.json({ amount: result[0].total || 0 });
  } catch (error) {
    console.error('获取当月已结算金额失败:', error);
    return NextResponse.json(
      { error: '获取当月已结算金额失败' },
      { status: 500 }
    );
  }
}