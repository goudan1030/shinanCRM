import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { is_top } = await request.json();
    
    // 验证状态值
    if (typeof is_top !== 'number' || ![0, 1].includes(is_top)) {
      return NextResponse.json(
        { error: '置顶状态值必须是 0 或 1' },
        { status: 400 }
      );
    }

    // 如果是设置置顶，需要先获取当前最大的排序号
    let sort_order = 0;
    if (is_top === 1) {
      const [rows] = await executeQuery(
        'SELECT MAX(sort_order) as max_sort FROM articles WHERE is_top = 1'
      );
      sort_order = rows[0].max_sort ? rows[0].max_sort + 10 : 10;
    }

    // 更新数据库
    await executeQuery(
      'UPDATE articles SET is_top = ?, sort_order = ? WHERE id = ?',
      [is_top, sort_order, params.id]
    );

    return NextResponse.json({ 
      success: true,
      message: '置顶状态更新成功'
    });
  } catch (error) {
    console.error('更新文章置顶状态失败:', error);
    return NextResponse.json(
      { error: '更新置顶状态失败' },
      { status: 500 }
    );
  }
} 