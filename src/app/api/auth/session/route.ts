import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');

    if (!authToken) {
      return NextResponse.json({ user: null });
    }

    try {
      const userData = JSON.parse(authToken.value);
      // 从cookie中获取完整的用户信息
      return NextResponse.json({
        user: {
          id: userData.userId,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          avatar_url: userData.avatar_url
        }
      });
    } catch (parseError) {
      console.error('解析auth_token失败:', parseError);
      return NextResponse.json({ user: null });
    }

  } catch (error) {
    console.error('获取会话状态失败:', error);
    return NextResponse.json(
      { error: '获取会话状态失败' },
      { status: 500 }
    );
  }
}