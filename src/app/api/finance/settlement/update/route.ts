import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 验证必填字段
    if (!data.id || !data.settlement_date || !data.amount) {
      return NextResponse.json(
        { error: '请填写必要的信息' },
        { status: 400 }
      );
    }

    // 更新结算记录
    const [result] = await pool.execute(
      'UPDATE settlement_records SET settlement_date = ?, amount = ? WHERE id = ?',
      [
        data.settlement_date,
        parseFloat(data.amount),
        data.id
      ]
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('更新结算记录失败:', error);
    return NextResponse.json(
      { error: '更新结算记录失败' },
      { status: 500 }
    );
  }
}