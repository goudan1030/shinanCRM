import { NextResponse } from 'next/server';
import pool from '../../../../../lib/mysql';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    // 获取当前日期
    const now = new Date();
    
    // 当月第一天
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    
    // 当月最后一天
    const lastDay = new Date(year, month + 1, 0);
    const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    console.log('结算记录API查询范围:', firstDayStr, '至', lastDayStr);

    // 检查是否有settlement_records表
    try {
      // 查询settlement_records表中当月的结算记录
      const [results] = await pool.query<RowDataPacket[]>(`
        SELECT SUM(amount) as total_amount 
        FROM settlement_records 
        WHERE settlement_date BETWEEN ? AND ?
      `, [firstDayStr, lastDayStr]);
      
      const settledAmount = results[0]?.total_amount || 0;
      console.log('当月已结算金额:', settledAmount);
      
      return NextResponse.json({ amount: settledAmount });
    } catch (innerError) {
      console.error('查询settlement_records表失败:', innerError);
      // 如果查询失败，返回模拟数据，但需明确这只是模拟数据
      console.log('返回模拟的当月已结算金额: 5000');
      return NextResponse.json({ amount: 5000, isMock: true });
    }
  } catch (error) {
    console.error('获取当月已结算金额失败:', error);
    return NextResponse.json(
      { error: '获取当月已结算金额失败', details: error.message },
      { status: 500 }
    );
  }
}