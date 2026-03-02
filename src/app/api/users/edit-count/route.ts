import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

// 增加用户剩余编辑次数（profile_edit_remaining）
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { userId, addCount } = data as {
      userId: number;
      addCount: number;
    };

    if (!userId || !addCount || addCount <= 0) {
      return NextResponse.json(
        { success: false, error: '参数无效' },
        { status: 400 }
      );
    }

    const [userResult] = await executeQuery(
      'SELECT id, profile_edit_remaining FROM users WHERE id = ?',
      [userId]
    );

    const users = userResult as any[];
    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const currentUser = users[0];
    const currentRemaining = Number(currentUser.profile_edit_remaining ?? 0);
    const newCount = currentRemaining + addCount;

    await executeQuery(
      'UPDATE users SET profile_edit_remaining = ? WHERE id = ?',
      [newCount, userId]
    );

    return NextResponse.json({
      success: true,
      message: '编辑次数更新成功',
      oldCount: currentRemaining,
      addCount: addCount,
      newCount: newCount,
    });
  } catch (error: unknown) {
    console.error('增加编辑次数失败:', error);

    if (error instanceof Error) {
      if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          {
            success: false,
            error: '数据库连接失败，请检查服务器配置',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: '增加编辑次数失败',
        details: error instanceof Error ? error.message : '服务器内部错误',
      },
      { status: 500 }
    );
  }
}
