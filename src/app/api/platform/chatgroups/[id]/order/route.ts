import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { RowDataPacket } from 'mysql2';

// 调整群聊显示顺序
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    
    if (!body.direction || !['up', 'down'].includes(body.direction)) {
      return NextResponse.json(
        { success: false, error: '方向参数错误，必须为 up 或 down' },
        { status: 400 }
      );
    }
    
    // 获取当前群聊信息
    const [currentRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM chat_groups WHERE id = ?',
      [id]
    );
    
    if (currentRows.length === 0) {
      return NextResponse.json(
        { success: false, error: '群聊不存在' },
        { status: 404 }
      );
    }
    
    const currentGroup = currentRows[0];
    const currentOrder = currentGroup.display_order;
    
    // 根据方向找到相邻的群聊
    const orderCondition = body.direction === 'up' 
      ? 'display_order < ? ORDER BY display_order DESC' 
      : 'display_order > ? ORDER BY display_order ASC';
    
    const [adjacentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM chat_groups WHERE ${orderCondition} LIMIT 1`,
      [currentOrder]
    );
    
    // 如果没有相邻群聊，则无法调整顺序
    if (adjacentRows.length === 0) {
      return NextResponse.json(
        { success: false, error: `已经是${body.direction === 'up' ? '最前' : '最后'}一个，无法继续调整` },
        { status: 400 }
      );
    }
    
    const adjacentGroup = adjacentRows[0];
    const adjacentOrder = adjacentGroup.display_order;
    
    // 交换两个群聊的顺序
    await pool.execute(
      'UPDATE chat_groups SET display_order = ? WHERE id = ?',
      [adjacentOrder, id]
    );
    
    await pool.execute(
      'UPDATE chat_groups SET display_order = ? WHERE id = ?',
      [currentOrder, adjacentGroup.id]
    );
    
    return NextResponse.json({
      success: true,
      message: '显示顺序调整成功'
    });
  } catch (error) {
    console.error('调整群聊顺序失败:', error);
    return NextResponse.json(
      { success: false, error: '调整群聊顺序失败' },
      { status: 500 }
    );
  }
} 