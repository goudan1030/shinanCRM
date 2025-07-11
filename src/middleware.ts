import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  getTokenFromRequest, 
  verifyToken, 
  setTokenCookie, 
  refreshToken, 
  shouldRefreshToken,
  hasPermission,
  UserPayload
} from './lib/token-edge';

// 定义需要保护的路由及其所需角色
const protectedRoutes: Record<string, string | string[]> = {
  '/dashboard': 'user',
  '/settings': 'admin',
  '/members': 'user',
  '/matches': 'user',
  '/reports': 'manager',
  '/finance': 'manager',
  '/platform': 'manager',
  '/miniapp': 'manager',
  '/wecom': 'manager',
  '/users': 'admin'
};

// 定义API路由权限
const apiRoutePermissions: Record<string, string | string[]> = {
  '/api/users': 'admin',
  '/api/finance': 'manager',
  '/api/platform': 'manager',
  '/api/miniapp': 'manager',
  '/api/wecom': 'manager',
  '/api/members': 'user'
};

// 定义公开路由
const publicRoutes = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/wecom/message', // 企业微信消息接收URL
  '/api/wecom/verify',  // 企业微信验证URL
  '/api/wecom/callback', // 企业微信回调URL
];

// 中间件实现
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过静态资源
  if (
    pathname.startsWith('/_next') || 
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 公开路由直接访问
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 获取Token
  const token = getTokenFromRequest(request);
  
  // 没有Token，重定向到登录页面
  if (!token) {
    // 如果是API请求，返回401错误
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: '未授权访问', message: '请先登录' },
        { status: 401 }
      );
    }
    
    // 非API请求重定向到登录页
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // 验证Token有效性
  const userData = await verifyToken(token);
  
  // Token无效，重定向到登录页面
  if (!userData) {
    // 如果是API请求，返回401错误
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Token无效', message: '请重新登录' },
        { status: 401 }
      );
    }
    
    // 非API请求重定向到登录页
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 检查权限
  const userRole = userData.role;
  
  // 检查页面访问权限
  for (const [routePrefix, requiredRole] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(routePrefix)) {
      // 使用token-edge中的hasPermission函数检查权限
      const hasAccess = hasPermission(userRole, requiredRole);
      
      if (!hasAccess) {
        // 如果是API请求，返回403错误
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: '权限不足', message: '您没有权限访问此资源' },
            { status: 403 }
          );
        }
        
        // 非API请求重定向到首页
        return NextResponse.redirect(new URL('/dashboard', request.url));
}
      break;
    }
  }
  
  // 检查API路由权限
  if (pathname.startsWith('/api/')) {
    for (const [apiPrefix, requiredRole] of Object.entries(apiRoutePermissions)) {
      if (pathname.startsWith(apiPrefix)) {
        const hasAccess = hasPermission(userRole, requiredRole);
        
        if (!hasAccess) {
          return NextResponse.json(
            { error: '权限不足', message: '您没有权限访问此API' },
            { status: 403 }
          );
        }
        break;
      }
    }
  }
  
  // 检查Token是否需要刷新
  const needsRefresh = await shouldRefreshToken(token);
  
  // 创建响应对象
  const response = NextResponse.next();
  
  // 如果Token需要刷新，生成新Token并设置Cookie
  if (needsRefresh) {
    const newToken = await refreshToken(userData);
    setTokenCookie(response, newToken);
  }
  
  return response;
}



// 配置中间件匹配的路由
export const config = {
  matcher: [
    // 匹配所有路由，除了静态资源
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};