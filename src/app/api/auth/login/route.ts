import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/mysql';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  console.log('=== 开始处理登录请求 ===');
  try {
    const { email, password } = await request.json();
    console.log('收到登录请求:', { email, passwordProvided: !!password });

    // 验证必填字段
    if (!email || !password) {
      console.log('✗ 登录失败: 缺少必填字段');
      return NextResponse.json(
        { error: '请输入邮箱和密码' },
        { status: 400 }
      );
    }

    // 验证用户凭据
    try {
      console.log('开始验证用户凭据...');
      const user = await authenticateUser(email, password);
      if (!user) {
        console.log('✗ 登录失败: 用户验证未通过');
        return NextResponse.json(
          { error: '邮箱或密码错误，请检查输入是否正确' },
          { status: 401 }
        );
      }

      console.log('✓ 用户验证通过，准备创建会话...');
      // 创建响应对象
      const response = NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar_url: user.avatar_url
        },
        message: '登录成功'
      });

      // 在响应中设置 cookie
      const authToken = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url
      };
      console.log('设置认证 Cookie:', { userId: user.id, email: user.email });
      response.cookies.set('auth_token', JSON.stringify(authToken), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 // 24小时
      });

      console.log('✓ 登录成功');
      console.log('=== 登录请求处理完成 ===');
      return response;

    } catch (authError) {
      console.error('✗ 用户验证过程出错:', authError);
      return NextResponse.json(
        { error: authError.message || '验证过程发生错误' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('✗ 登录请求处理失败:', error);
    return NextResponse.json(
      { error: '登录失败，请重试' },
      { status: 500 }
    );
  }
}