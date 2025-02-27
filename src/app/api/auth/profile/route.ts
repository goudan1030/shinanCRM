import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { updateUserProfile } from '@/lib/mysql';

export async function PUT(request: Request) {
  try {
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth_token');

    if (!authToken?.value) {
      return new NextResponse('未授权访问', { status: 401 });
    }

    const user = JSON.parse(authToken.value);
    if (!user?.userId) {
      return new NextResponse('未授权访问', { status: 401 });
    }

    const data = await request.json();
    const { name, email } = data;

    // 验证输入
    if (!name || !email) {
      return new NextResponse('姓名和邮箱不能为空', { status: 400 });
    }

    // 更新用户信息
    await updateUserProfile(user.userId, { name, email });

    return new NextResponse('更新成功', { status: 200 });
  } catch (error) {
    console.error('更新个人资料失败:', error);
    return new NextResponse(
      error instanceof Error ? error.message : '更新失败',
      { status: 500 }
    );
  }
}