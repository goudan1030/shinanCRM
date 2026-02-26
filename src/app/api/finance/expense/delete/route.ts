import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

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

    // 删除支出记录
    const [result] = await executeQuery(
      'DELETE FROM expense_records WHERE id = ?',
      [id]
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('删除支出记录失败:', error);
    return NextResponse.json(
      { error: '删除支出记录失败' },
      { status: 500 }
    );
  }
}