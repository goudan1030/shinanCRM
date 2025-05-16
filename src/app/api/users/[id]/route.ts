import { NextResponse } from 'next/server';
import query from '@/lib/db';

// 获取单个用户
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const users = await query(
      `SELECT u.*, vm.member_id 
       FROM users u
       LEFT JOIN view_user_members vm ON u.id = vm.user_id
       WHERE u.id = ?`, 
      [userId]
    );
    const user = (users as any[])[0];
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      user 
    });
  } catch (error: any) {
    console.error('获取用户详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户详情失败' },
      { status: 500 }
    );
  }
}

// 更新用户
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const data = await request.json() as Record<string, any>;
    
    // 检查用户是否存在
    const existingUsers = await query('SELECT * FROM users WHERE id = ?', [userId]);
    if ((existingUsers as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    
    // 构建更新字段
    const updateFields: string[] = [];
    const values: any[] = [];
    
    // 可更新的字段
    const allowedFields = [
      'phone', 'username', 'nickname', 'password', 'avatar', 
      'notification_enabled', 'status', 'registered',
      'refresh_count', 'member_type'
    ];
    
    // 动态构建更新语句
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(data[field]);
      }
    }
    
    // 如果没有字段更新，直接返回成功
    if (updateFields.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: '用户更新成功（无字段变更）'
      });
    }
    
    // 添加用户ID到参数列表
    values.push(userId);
    
    // 执行更新
    await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );
    
    return NextResponse.json({ 
      success: true, 
      message: '用户更新成功'
    });
  } catch (error: any) {
    console.error('更新用户失败:', error);
    return NextResponse.json(
      { success: false, error: '更新用户失败' },
      { status: 500 }
    );
  }
}

// 删除用户
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    
    // 检查用户是否存在
    const existingUsers = await query('SELECT * FROM users WHERE id = ?', [userId]);
    if ((existingUsers as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    
    // 执行删除
    await query('DELETE FROM users WHERE id = ?', [userId]);
    
    return NextResponse.json({ 
      success: true, 
      message: '用户删除成功'
    });
  } catch (error: any) {
    console.error('删除用户失败:', error);
    return NextResponse.json(
      { success: false, error: '删除用户失败' },
      { status: 500 }
    );
  }
} 