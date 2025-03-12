import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { RowDataPacket } from 'mysql2';

// 获取所有群聊
export async function GET() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM chat_groups ORDER BY display_order ASC'
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取群聊列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取群聊列表失败' },
      { status: 500 }
    );
  }
}

// 添加新群聊
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 验证必填字段
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: '群聊名称不能为空' },
        { status: 400 }
      );
    }

    // 处理可选字段
    const qrcode_image = body.qrcode_image || null;
    const description = body.description || null;
    const member_count = body.member_count || 0;
    const is_active = body.is_active !== undefined ? body.is_active : 1;
    
    // 如果没有指定display_order，获取最大的display_order并加1
    let display_order = body.display_order;
    if (!display_order) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT MAX(display_order) as max_order FROM chat_groups'
      );
      display_order = (rows[0]?.max_order || 0) + 1;
    }

    // 插入数据
    const [result] = await pool.execute(
      `INSERT INTO chat_groups 
       (name, qrcode_image, display_order, is_active, description, member_count) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [body.name, qrcode_image, display_order, is_active, description, member_count]
    );
    
    // @ts-ignore - 获取插入的ID
    const insertId = result.insertId;
    
    // 获取刚插入的记录
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM chat_groups WHERE id = ?',
      [insertId]
    );

    return NextResponse.json({
      success: true,
      message: '群聊添加成功',
      data: rows[0]
    });
  } catch (error) {
    console.error('添加群聊失败:', error);
    return NextResponse.json(
      { success: false, error: '添加群聊失败' },
      { status: 500 }
    );
  }
} 