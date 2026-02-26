import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { updateUserPassword, authenticateUser } from '@/lib/database-netlify';

export async function PUT(request: Request) {
  try {
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth_token');

    if (!authToken?.value) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const user = JSON.parse(authToken.value);
    if (!user?.userId || !user?.email) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { currentPassword, newPassword } = data;

    // 验证输入
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: '当前密码和新密码不能为空' },
        { status: 400 }
      );
    }

    // 验证当前密码是否正确
    const userAuth = await authenticateUser(user.email, currentPassword);
    if (!userAuth) {
      return NextResponse.json(
        { error: '当前密码错误' },
        { status: 401 }
      );
    }

    // 更新用户密码
    await updateUserPassword(user.userId, newPassword);

    // 更新成功后，返回新的用户信息
    return NextResponse.json({ message: '密码更新成功' });

  } catch (error) {
    console.error('更新密码失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}