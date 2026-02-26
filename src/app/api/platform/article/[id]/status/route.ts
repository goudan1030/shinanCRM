import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { is_hidden } = await request.json();
    
    // 验证状态值
    if (typeof is_hidden !== 'number' || ![0, 1].includes(is_hidden)) {
      return NextResponse.json(
        { error: '状态值必须是 0 或 1' },
        { status: 400 }
      );
    }

    // 更新数据库
    await executeQuery(
      'UPDATE articles SET is_hidden = ? WHERE id = ?',
      [is_hidden, params.id]
    );

    return NextResponse.json({ 
      success: true,
      message: '状态更新成功'
    });
  } catch (error) {
    console.error('更新文章状态失败:', error);
    return NextResponse.json(
      { error: '更新状态失败' },
      { status: 500 }
    );
  }
} 