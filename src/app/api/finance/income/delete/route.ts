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

    // 删除收入记录
    const [result] = await executeQuery(
      'DELETE FROM income_records WHERE id = ?',
      [id]
    );

    const response = NextResponse.json({ success: true, data: result });
    
    // 设置防缓存头
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('删除收入记录失败:', error);
    return NextResponse.json(
      { error: '删除收入记录失败' },
      { status: 500 }
    );
  }
}