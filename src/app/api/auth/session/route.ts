import { NextResponse } from 'next/server';
import { getTokenFromCookieStore, verifyToken } from '../../../../lib/token';

export async function GET() {
  try {
    // 获取并验证Token
    const token = await getTokenFromCookieStore();

    if (!token) {
      return NextResponse.json({ user: null });
    }

    // 验证Token并获取用户信息
    const userData = verifyToken(token);
    
    if (!userData) {
      return NextResponse.json({ user: null });
    }

    // 返回用户信息
      return NextResponse.json({
        user: {
        id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          avatar_url: userData.avatar_url
        }
      });

  } catch (error) {
    console.error('获取会话状态失败:', error);
    return NextResponse.json(
      { error: '获取会话状态失败' },
      { status: 500 }
    );
  }
}