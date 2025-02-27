import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (!id) {
      return NextResponse.json(
        { error: '参数错误' },
        { status: 400 }
      );
    }

    // 删除Banner
    await pool.execute(
      'DELETE FROM banners WHERE id = ?',
      [id]
    );

    return NextResponse.json({ 
      success: true,
      message: '删除成功'
    });

  } catch (error) {
    console.error('删除Banner失败:', error);
    return NextResponse.json(
      { error: '删除失败' },
      { status: 500 }
    );
  }
} 