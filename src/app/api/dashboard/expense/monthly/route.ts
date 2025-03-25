import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
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

    console.log('当月支出API查询范围(UTC修正):', firstDayStr, '至', lastDayStr);

    // 查询当月支出总额 - 按照支出日期(expense_date)统计
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT SUM(amount) as total FROM expense_records WHERE expense_date >= ? AND expense_date <= ?',
      [firstDayStr, lastDayStr]
    );

    console.log('当月支出API查询结果:', rows);

    // 安全地处理结果
    const total = rows && rows[0] && rows[0].total ? Number(rows[0].total) : 0;

    return NextResponse.json({ amount: total });
  } catch (error) {
    console.error('获取当月支出失败:', error);
    return NextResponse.json(
      { error: '获取当月支出失败' },
      { status: 500 }
    );
  }
} 