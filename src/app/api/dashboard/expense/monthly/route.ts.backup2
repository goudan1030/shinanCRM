import { NextResponse } from 'next/server';
import pool from '../../../../../lib/mysql';
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

    try {
      // 查询expense_records表中当月的支出记录
      const [results] = await pool.execute<RowDataPacket[]>(
        'SELECT SUM(amount) as total FROM expense_records WHERE expense_date BETWEEN ? AND ?',
        [firstDayStr, lastDayStr]
      );
      
      const monthlyExpense = results[0]?.total || 0;
      console.log('当月实际支出:', monthlyExpense);
      
      return NextResponse.json({ amount: monthlyExpense });
    } catch (innerError) {
      console.error('查询expense_records表失败:', innerError);
      // 如果查询失败，返回模拟数据，并标记为模拟数据
      console.log('返回模拟的当月支出: 15000');
      return NextResponse.json({ amount: 15000, isMock: true });
    }
  } catch (error) {
    console.error('获取当月支出失败:', error);
    return NextResponse.json(
      { error: '获取当月支出失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 