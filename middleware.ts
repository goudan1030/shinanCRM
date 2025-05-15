import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 定义需要保护的路由
const protectedRoutes = [
  '/dashboard',
  '/settings',
  '/members',
  '/matches',
  '/reports',
  '/finance',
  '/platform',
  '/miniapp',
  '/wecom',
  '/users'
];

// 定义公开路由
const publicRoutes = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
];

// 简化中间件实现，专注于核心认证逻辑
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 处理静态资源的缓存
  if (
    pathname.startsWith('/_next') || 
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf)$/)
  ) {
    const response = NextResponse.next();
    
    // 为静态资源添加缓存控制
    response.headers.set(
      'Cache-Control', 
      'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=31536000'
    );
    return response;
  }

  // 处理API请求的缓存
  if (pathname.includes('/api/')) {
    const response = NextResponse.next();
    
    // 动态API接口（可能经常变化的数据）
    if (
      pathname.includes('/api/dashboard') ||
      pathname.includes('/api/members')
    ) {
      // 短期缓存 - 1分钟，并允许后台刷新
      response.headers.set(
        'Cache-Control',
        'public, max-age=60, s-maxage=120, stale-while-revalidate=600'
      );
    } 
    // 相对静态的API数据
    else if (
      pathname.includes('/api/platform') ||
      pathname.includes('/api/miniapp/config')
    ) {
      // 中等缓存期 - 1小时
      response.headers.set(
        'Cache-Control',
        'public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400'
      );
    }
    
    return response;
  }

  // 登录页面无需验证
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // 验证其他页面
  const authToken = request.cookies.get('auth_token');
  if (!authToken && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// 配置中间件匹配的路由
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 