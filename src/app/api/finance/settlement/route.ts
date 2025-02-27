import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 验证必填字段
    if (!data.member_no || !data.settlement_date || !data.amount) {
      return NextResponse.json(
        { error: '请填写必要的信息' },
        { status: 400 }
      );
    }

    // 插入结算记录
    const [result] = await pool.execute(
      'INSERT INTO settlement_records (member_no, settlement_date, amount, notes, operator_id) VALUES (?, ?, ?, ?, ?)',
      [
        data.member_no,
        data.settlement_date,
        parseFloat(data.amount),
        data.notes || null,
        data.operator_id
      ]
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('创建结算记录失败:', error);
    return NextResponse.json(
      { error: '创建结算记录失败' },
      { status: 500 }
    );
  }
}