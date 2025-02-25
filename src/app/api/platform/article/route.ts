import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

// 获取文章列表
export async function GET() {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM articles ORDER BY is_top DESC, sort_order DESC, created_at DESC'
    );
    
    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    return NextResponse.json(
      { error: '获取文章列表失败' },
      { status: 500 }
    );
  }
}

// 新增/更新文章
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (data.id) {
      // 更新文章
      await pool.execute(
        `UPDATE articles SET 
          title = ?, 
          cover_url = ?,
          content = ?,
          summary = ?,
          link_url = ?,
          is_hidden = ?,
          is_top = ?,
          sort_order = ?
        WHERE id = ?`,
        [
          data.title,
          data.cover_url,
          data.content,
          data.summary,
          data.link_url,
          data.is_hidden,
          data.is_top,
          data.sort_order,
          data.id
        ]
      );
    } else {
      // 新增文章
      await pool.execute(
        `INSERT INTO articles (
          title, cover_url, content, summary, 
          link_url, is_hidden, is_top, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.title,
          data.cover_url,
          data.content,
          data.summary,
          data.link_url,
          data.is_hidden,
          data.is_top,
          data.sort_order
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: data.id ? '更新成功' : '创建成功'
    });
  } catch (error) {
    console.error('保存文章失败:', error);
    return NextResponse.json(
      { error: '保存文章失败' },
      { status: 500 }
    );
  }
} 