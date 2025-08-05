import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { RowDataPacket } from 'mysql2';

// 获取单个群聊详情
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    
    const [rows] = await executeQuery<RowDataPacket[]>(
      'SELECT * FROM chat_groups WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '群聊不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('获取群聊详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取群聊详情失败' },
      { status: 500 }
    );
  }
}

// 更新群聊信息
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();
    
    // 验证群聊是否存在
    const [checkRows] = await executeQuery<RowDataPacket[]>(
      'SELECT id FROM chat_groups WHERE id = ?',
      [id]
    );

    if (checkRows.length === 0) {
      return NextResponse.json(
        { success: false, error: '群聊不存在' },
        { status: 404 }
      );
    }

    // 构建更新字段
    const updates = [];
    const values = [];
    
    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }
    
    if (body.qrcode_image !== undefined) {
      updates.push('qrcode_image = ?');
      values.push(body.qrcode_image);
    }
    
    if (body.display_order !== undefined) {
      updates.push('display_order = ?');
      values.push(body.display_order);
    }
    
    if (body.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(body.is_active);
    }
    
    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description);
    }
    
    if (body.member_count !== undefined) {
      updates.push('member_count = ?');
      values.push(body.member_count);
    }
    
    // 如果没有更新字段，直接返回成功
    if (updates.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: '无需更新', 
        data: checkRows[0] 
      });
    }
    
    // 将ID添加到values数组末尾
    values.push(id);
    
    // 执行更新
    await executeQuery(
      `UPDATE chat_groups SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
    
    // 获取更新后的记录
    const [rows] = await executeQuery<RowDataPacket[]>(
      'SELECT * FROM chat_groups WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: '群聊更新成功',
      data: rows[0]
    });
  } catch (error) {
    console.error('更新群聊失败:', error);
    return NextResponse.json(
      { success: false, error: '更新群聊失败' },
      { status: 500 }
    );
  }
}

// 删除群聊
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    
    // 验证群聊是否存在
    const [checkRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM chat_groups WHERE id = ?',
      [id]
    );

    if (checkRows.length === 0) {
      return NextResponse.json(
        { success: false, error: '群聊不存在' },
        { status: 404 }
      );
    }
    
    // 执行删除
    await executeQuery(
      'DELETE FROM chat_groups WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: '群聊删除成功'
    });
  } catch (error) {
    console.error('删除群聊失败:', error);
    return NextResponse.json(
      { success: false, error: '删除群聊失败' },
      { status: 500 }
    );
  }
} 