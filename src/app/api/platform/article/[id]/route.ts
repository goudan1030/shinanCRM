import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

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

    // 删除文章
    await executeQuery(
      'DELETE FROM articles WHERE id = ?',
      [id]
    );

    return NextResponse.json({ 
      success: true,
      message: '删除成功'
    });

  } catch (error) {
    console.error('删除文章失败:', error);
    return NextResponse.json(
      { error: '删除失败' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const [rows] = await executeQuery(
      'SELECT * FROM articles WHERE id = ?',
      [params.id]
    );

    if (!rows[0]) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('获取文章详情失败:', error);
    return NextResponse.json(
      { error: '获取文章详情失败' },
      { status: 500 }
    );
  }
} 