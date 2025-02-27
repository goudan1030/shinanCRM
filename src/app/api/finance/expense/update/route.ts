import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 验证必填字段
    if (!data.id || !data.expense_date || !data.amount) {
      return NextResponse.json(
        { error: '请填写必要的信息' },
        { status: 400 }
      );
    }

    // 更新支出记录
    const [result] = await pool.execute(
      'UPDATE expense_records SET expense_date = ?, amount = ?, notes = ? WHERE id = ?',
      [
        data.expense_date,
        parseFloat(data.amount),
        data.notes || null,
        data.id
      ]
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('更新支出记录失败:', error);
    return NextResponse.json(
      { error: '更新支出记录失败' },
      { status: 500 }
    );
  }
}