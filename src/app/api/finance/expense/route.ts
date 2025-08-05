import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 验证必填字段
    if (!data.expense_date || !data.amount) {
      return NextResponse.json(
        { error: '请填写必要的信息' },
        { status: 400 }
      );
    }

    // 插入支出记录
    const [result] = await executeQuery(
      'INSERT INTO expense_records (expense_date, amount, notes, operator_id) VALUES (?, ?, ?, ?)',
      [
        data.expense_date,
        parseFloat(data.amount),
        data.notes || null,
        data.operator_id
      ]
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('创建支出记录失败:', error);
    return NextResponse.json(
      { error: '创建支出记录失败' },
      { status: 500 }
    );
  }
}