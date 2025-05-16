import { NextResponse } from 'next/server';
import { getTokenFromCookieStore, verifyToken } from '../../../../lib/token';

export async function GET() {
  console.log('=== 开始检查用户会话 ===');
  try {
    // 获取并验证Token
    const token = await getTokenFromCookieStore();

    if (!token) {
      console.log('✗ 没有找到认证Token');
      return NextResponse.json(
        { user: null },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    console.log('✓ 找到Token，开始验证...');

    // 验证Token并获取用户信息
    const userData = verifyToken(token);
    
    if (!userData) {
      console.log('✗ Token验证失败，可能已过期');
      return NextResponse.json(
        { user: null },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    console.log('✓ Token验证成功，用户ID:', userData.id);

    // 返回用户信息
    const response = NextResponse.json({
        user: {
        id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          avatar_url: userData.avatar_url
        }
      });
    
    // 设置不缓存头
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    
    console.log('=== 会话检查完成 ===');
    return response;

  } catch (error) {
    console.error('✗ 获取会话状态失败:', error);
    const response = NextResponse.json(
      { error: '获取会话状态失败', user: null },
      { status: 500 }
    );
    
    // 设置不缓存头
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    
    return response;
  }
}