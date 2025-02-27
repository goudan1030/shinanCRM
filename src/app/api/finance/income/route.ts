import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 验证必填字段
    if (!data.member_no || !data.payment_method || !data.amount) {
      return NextResponse.json(
        { error: '请填写必要的信息' },
        { status: 400 }
      );
    }

    // 插入收入记录
    const [result] = await pool.execute(
      'INSERT INTO income_records (member_no, payment_date, payment_method, amount, notes, operator_id) VALUES (?, ?, ?, ?, ?, ?)',
      [
        data.member_no,
        data.payment_date,
        data.payment_method,
        parseFloat(data.amount),
        data.notes || null,
        data.operator_id
      ]
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('创建收入记录失败:', error);
    return NextResponse.json(
      { error: '创建收入记录失败' },
      { status: 500 }
    );
  }
}