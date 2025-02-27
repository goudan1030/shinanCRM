import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 验证必填字段
    if (!data.id || !data.member_no || !data.payment_date || !data.amount) {
      return NextResponse.json(
        { error: '请填写必要的信息' },
        { status: 400 }
      );
    }

    // 更新收入记录
    const [result] = await pool.execute(
      'UPDATE income_records SET member_no = ?, payment_date = ?, payment_method = ?, amount = ?, notes = ? WHERE id = ?',
      [
        data.member_no,
        data.payment_date,
        data.payment_method,
        parseFloat(data.amount),
        data.notes || null,
        data.id
      ]
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('更新收入记录失败:', error);
    return NextResponse.json(
      { error: '更新收入记录失败' },
      { status: 500 }
    );
  }
}