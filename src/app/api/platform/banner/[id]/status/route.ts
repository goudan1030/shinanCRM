import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json();
    
    // 验证状态值
    if (typeof status !== 'number' || ![0, 1].includes(status)) {
      return NextResponse.json(
        { error: '状态值必须是 0 或 1' },
        { status: 400 }
      );
    }

    // 更新数据库
    await pool.execute(
      'UPDATE banners SET status = ? WHERE id = ?',
      [status, params.id]
    );

    return NextResponse.json({ 
      success: true,
      message: '状态更新成功'
    });
  } catch (error) {
    console.error('更新Banner状态失败:', error);
    return NextResponse.json(
      { error: '更新状态失败' },
      { status: 500 }
    );
  }
} 