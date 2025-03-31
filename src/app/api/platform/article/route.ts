import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { readFile } from 'fs/promises';
import path from 'path';

// 获取文章列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset = (page - 1) * pageSize;

    // 获取总数
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM articles'
    );
    const total = countResult[0].total;

    // 获取分页数据
    const [rows] = await pool.execute(
      'SELECT * FROM articles ORDER BY is_top DESC, sort_order DESC, created_at DESC LIMIT ? OFFSET ?',
      [pageSize, offset]
    );
    
    return NextResponse.json({
      success: true,
      data: rows,
      total,
      totalPages: Math.ceil(total / pageSize)
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
    
    // 检查图片数据是否存在
    if (!data.cover_url) {
      return NextResponse.json(
        { error: '请上传封面图片' },
        { status: 400 }
      );
    }

    // 如果是相对路径，直接从文件系统读取
    if (data.cover_url.startsWith('/uploads/')) {
      try {
        // 获取图片的完整文件系统路径
        const imagePath = path.join(process.cwd(), 'public', data.cover_url);
        
        // 直接读取文件
        const imageBuffer = await readFile(imagePath);
        
        // 转换为 base64
        const base64Image = imageBuffer.toString('base64');
        
        // 根据文件扩展名确定 MIME 类型
        const ext = path.extname(imagePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 
                        ext === '.gif' ? 'image/gif' : 
                        'image/jpeg';
        
        data.cover_url = `data:${mimeType};base64,${base64Image}`;
      } catch (error) {
        console.error('图片读取失败:', error);
        return NextResponse.json(
          { error: '图片读取失败' },
          { status: 400 }
        );
      }
    }

    // 确保图片是 Base64 格式
    if (!data.cover_url.startsWith('data:image/')) {
      return NextResponse.json(
        { error: '图片必须是 Base64 格式' },
        { status: 400 }
      );
    }

    if (data.id) {
      // 更新文章
      const [result] = await pool.execute(
        `UPDATE articles SET 
          title = ?,
          cover_url = ?,
          content = ?,
          summary = ?,
          link_url = ?,
          is_hidden = ?,
          is_top = ?,
          sort_order = ?,
          updated_at = NOW()
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
      return NextResponse.json({ success: true });
    }

    // 新增文章
    const [result] = await pool.execute(
      `INSERT INTO articles (
        title, cover_url, content, summary, link_url,
        is_hidden, is_top, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
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

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('保存文章失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    );
  }
} // 强制更新于 Mon Mar  3 13:33:04 CST 2025
