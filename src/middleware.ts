import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 定义需要保护的路由
const protectedRoutes = [
  '/dashboard',
  '/settings',
  '/members',
  '/matches',
  '/reports',
];

// 定义公开路由
const publicRoutes = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否是API路由
  const isApiRoute = pathname.startsWith('/api/');
  // 如果是API路由且不在公开路由列表中，需要验证认证状态
  if (isApiRoute && !publicRoutes.includes(pathname)) {
    const authToken = request.cookies.get('auth_token');
    if (!authToken) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 检查是否需要保护的路由
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  if (isProtectedRoute) {
    const authToken = request.cookies.get('auth_token');
    if (!authToken) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token');
      return response;
    }
  }

  // 如果用户已登录且尝试访问登录页面，重定向到仪表盘
  if (pathname === '/login') {
    const authToken = request.cookies.get('auth_token');
    if (authToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

// 配置中间件匹配的路由
export const config = {
  matcher: [
    /*
     * 匹配所有路由除了：
     * - api/auth/login (登录API)
     * - _next (Next.js资源)
     * - favicon.ico, png, svg等静态资源
     */
    '/((?!api/auth/login|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};