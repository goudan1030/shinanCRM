import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    
    // 验证必填字段
    if (!id) {
      return NextResponse.json(
        { error: '请提供记录ID' },
        { status: 400 }
      );
    }

    // 删除结算记录
    const [result] = await pool.execute(
      'DELETE FROM settlement_records WHERE id = ?',
      [id]
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('删除结算记录失败:', error);
    return NextResponse.json(
      { error: '删除结算记录失败' },
      { status: 500 }
    );
  }
}