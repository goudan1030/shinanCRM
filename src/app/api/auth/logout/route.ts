import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // 创建响应对象
    const response = NextResponse.json({ message: '退出登录成功' });

    // 清除认证cookie
    response.cookies.delete('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    // 设置 Cache-Control 头，防止浏览器缓存
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('退出登录失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '退出登录失败' },
      { status: 500 }
    );
  }
}