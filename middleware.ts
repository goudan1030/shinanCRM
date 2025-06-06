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

// 定义公开路由 - 不需要认证的路由
const publicRoutes = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/debug/db-test',  // 添加诊断API到公开路由
  '/favicon.ico',
  '/_next',
];

// 检查路径是否匹配公开路由
function isPublicPath(path: string): boolean {
  return publicRoutes.some(route => path.startsWith(route) || path === route);
}

// 检查路径是否匹配需要保护的路由
function isProtectedPath(path: string): boolean {
  return protectedRoutes.some(route => path.startsWith(route) || path === route);
}

// 中间件主函数
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
    // 跳过认证检查的API路由
    if (isPublicPath(pathname)) {
      return NextResponse.next();
    }
    
    // 检查认证
    const authToken = request.cookies.get('auth_token');
    if (!authToken) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }
    
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

  // 公开路由无需验证
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 验证其他页面 - 尤其是受保护的路由
  const authToken = request.cookies.get('auth_token');
  
  if (!authToken) {
    // 如果没有token，重定向到登录页
    const url = new URL('/login', request.url);
    // 保存原始URL以便登录后重定向回来
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // 认证通过，继续处理请求
  return NextResponse.next();
}

// 配置中间件匹配的路由
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 