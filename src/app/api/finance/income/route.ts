import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

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
    const [result] = await executeQuery(
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

    const response = NextResponse.json({ success: true, data: result });
    
    // 设置防缓存头
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('创建收入记录失败:', error);
    return NextResponse.json(
      { error: '创建收入记录失败' },
      { status: 500 }
    );
  }
}