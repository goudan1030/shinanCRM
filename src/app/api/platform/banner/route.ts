import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 验证必填字段
    const requiredFields = ['category_id', 'title', 'sort_order', 'status'];
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === '') {
        return NextResponse.json(
          { error: `${field} 不能为空` },
          { status: 400 }
        );
      }
    }

    // 验证 category_id 是否为数字
    if (!Number.isInteger(data.category_id)) {
      return NextResponse.json(
        { error: 'category_id 必须是整数' },
        { status: 400 }
      );
    }

    // 使用传入的图片URL（后续可以改为真实的图片上传）
    const image_url = data.image_url || 'https://placeholder.com/banner.jpg';

    if (data.id) {
      // 更新
      await pool.execute(
        `UPDATE banners SET 
          category_id = ?, 
          title = ?, 
          image_url = ?,
          link_url = ?,
          sort_order = ?,
          status = ?,
          start_time = ?,
          end_time = ?,
          remark = ?
        WHERE id = ?`,
        [
          data.category_id,
          data.title,
          image_url,
          data.link_url || null,
          data.sort_order,
          data.status,
          data.start_time || null,
          data.end_time || null,
          data.remark || null,
          data.id
        ]
      );
    } else {
      // 新增
      await pool.execute(
        `INSERT INTO banners (
          category_id, 
          title, 
          image_url,
          link_url,
          sort_order,
          status,
          start_time,
          end_time,
          remark
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.category_id,
          data.title,
          image_url,
          data.link_url || null,
          data.sort_order,
          data.status,
          data.start_time || null,
          data.end_time || null,
          data.remark || null
        ]
      );
    }

    return NextResponse.json({ 
      success: true,
      message: data.id ? '更新成功' : '保存成功'
    });

  } catch (error) {
    console.error('保存Banner失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    );
  }
}

// 获取Banner列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    let sql = 'SELECT * FROM banners WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND category_id = ?';
      params.push(category);
    }

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY sort_order DESC, created_at DESC';

    const [rows] = await pool.execute(sql, params);

    return NextResponse.json({ 
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('获取Banner列表失败:', error);
    return NextResponse.json(
      { error: '获取列表失败' },
      { status: 500 }
    );
  }
} 