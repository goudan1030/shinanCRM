import { NextResponse } from 'next/server';
import { executeQuery, testNetlifyConnection } from '@/lib/database-netlify';

// 获取单个用户
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== 开始获取用户详情 ===');
    
    // 首先测试数据库连接
    const dbConnected = await testNetlifyConnection();
    if (!dbConnected) {
      throw new Error('数据库连接失败');
    }
    
    const userId = params.id;
    console.log('查询用户ID:', userId);
    
    const [users] = await executeQuery(
      `SELECT u.*, vm.member_id 
       FROM users u
       LEFT JOIN view_user_members vm ON u.id = vm.user_id
       WHERE u.id = ?`, 
      [userId]
    );
    const user = (users as any[])[0];
    
    if (!user) {
      console.log('用户不存在:', userId);
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    
    console.log('✓ 用户详情查询成功');
    
    return NextResponse.json({ 
      success: true, 
      user 
    });
  } catch (error: any) {
    console.error('获取用户详情失败:', error);
    
    // 详细的错误日志
    if (error instanceof Error) {
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: '获取用户详情失败',
        details: error instanceof Error ? error.message : '服务器内部错误'
      },
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
    console.log('=== 开始更新用户 ===');
    
    // 首先测试数据库连接
    const dbConnected = await testNetlifyConnection();
    if (!dbConnected) {
      throw new Error('数据库连接失败');
    }
    
    const userId = params.id;
    const data = await request.json() as Record<string, any>;
    
    console.log('更新用户ID:', userId, '数据:', Object.keys(data));
    
    // 检查用户是否存在
    const [existingUsers] = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
    if ((existingUsers as any[]).length === 0) {
      console.log('用户不存在:', userId);
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
      console.log('无字段变更');
      return NextResponse.json({ 
        success: true, 
        message: '用户更新成功（无字段变更）'
      });
    }
    
    // 自动更新状态逻辑：如果资料已完善（registered=1），状态应该为active
    const existingUser = (existingUsers as any[])[0];
    const newRegistered = data.registered !== undefined ? data.registered : existingUser.registered;
    const currentStatus = existingUser.status;
    const isStatusManuallyUpdated = data.status !== undefined;
    
    // 只有在registered字段被更新且status未被手动更新时，才自动更新status
    if (data.registered !== undefined && !isStatusManuallyUpdated) {
      if (newRegistered === 1 && currentStatus === 'temporary') {
        // 如果status不在更新列表中，添加它
        if (!updateFields.some(f => f.includes('status'))) {
          updateFields.push('status = ?');
          values.push('active');
          console.log('自动更新状态：资料已完善，状态从temporary更新为active');
        }
      }
      // 如果资料未完善且当前状态是active，自动更新为temporary（但disabled状态保持不变）
      else if (newRegistered === 0 && currentStatus === 'active') {
        if (!updateFields.some(f => f.includes('status'))) {
          updateFields.push('status = ?');
          values.push('temporary');
          console.log('自动更新状态：资料未完善，状态从active更新为temporary');
        }
      }
    }
    
    // 添加用户ID到参数列表
    values.push(userId);
    
    // 执行更新
    console.log('执行更新操作...');
    await executeQuery(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
    
    console.log('✓ 用户更新成功');
    
    return NextResponse.json({ 
      success: true, 
      message: '用户更新成功'
    });
  } catch (error: any) {
    console.error('更新用户失败:', error);
    
    // 详细的错误日志
    if (error instanceof Error) {
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: '更新用户失败',
        details: error instanceof Error ? error.message : '服务器内部错误'
      },
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
    console.log('=== 开始删除用户 ===');
    
    // 首先测试数据库连接
    const dbConnected = await testNetlifyConnection();
    if (!dbConnected) {
      throw new Error('数据库连接失败');
    }
    
    const userId = params.id;
    console.log('删除用户ID:', userId);
    
    // 检查用户是否存在
    const [existingUsers] = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
    if ((existingUsers as any[]).length === 0) {
      console.log('用户不存在:', userId);
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    
    // 执行删除
    console.log('执行删除操作...');
    await executeQuery('DELETE FROM users WHERE id = ?', [userId]);
    
    console.log('✓ 用户删除成功');
    
    return NextResponse.json({ 
      success: true, 
      message: '用户删除成功'
    });
  } catch (error: any) {
    console.error('删除用户失败:', error);
    
    // 详细的错误日志
    if (error instanceof Error) {
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: '删除用户失败',
        details: error instanceof Error ? error.message : '服务器内部错误'
      },
      { status: 500 }
    );
  }
} 