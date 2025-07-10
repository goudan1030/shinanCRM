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
  '/api/wecom/message',  // 企业微信消息接收API
  '/api/wecom/message-test',  // 企业微信消息测试API
  '/favicon.ico',
  '/_next',
  '/WW_verify_',  // 企业微信域名验证文件
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
  
  // 检测是否在Netlify环境
  const isNetlify = process.env.NETLIFY === 'true';
  
  console.log('中间件处理路径:', pathname, '是否Netlify环境:', isNetlify);
  
  // 处理企业微信验证文件 - 直接返回，不做任何处理
  if (pathname.startsWith('/WW_verify_')) {
    console.log('企业微信验证文件访问:', pathname);
    return NextResponse.next();
  }

  // 处理静态资源 - 禁用缓存
  if (
    pathname.startsWith('/_next') || 
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf)$/)
  ) {
    const response = NextResponse.next();
    
    // 禁用静态资源缓存
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  // 处理API请求 - 禁用缓存
  if (pathname.includes('/api/')) {
    // 跳过认证检查的API路由
    if (isPublicPath(pathname)) {
      const response = NextResponse.next();
      
      // 禁用API缓存
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      // 为Netlify环境添加特殊的CORS头
      if (isNetlify) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
      }
      
      return response;
    }
    
    // 检查认证 - 优化cookie读取
    const authToken = request.cookies.get('auth_token');
    console.log('API请求认证检查:', { 
      path: pathname, 
      hasToken: !!authToken?.value,
      tokenLength: authToken?.value?.length 
    });
    
    if (!authToken) {
      return NextResponse.json(
        { 
          success: false,
          error: '未授权访问',
          message: '请先登录'
        },
        { status: 401 }
      );
    }
    
    const response = NextResponse.next();
    
    // 为Netlify环境添加特殊的CORS头
    if (isNetlify) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
    }
    
    // 禁用所有API缓存
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  }

  // 公开路由无需验证
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 验证其他页面 - 尤其是受保护的路由
  const authToken = request.cookies.get('auth_token');
  
  console.log('页面访问认证检查:', { 
    path: pathname, 
    hasToken: !!authToken?.value,
    tokenLength: authToken?.value?.length,
    isProtected: isProtectedPath(pathname)
  });
  
  if (!authToken) {
    // 如果没有token，重定向到登录页
    const url = new URL('/login', request.url);
    // 保存原始URL以便登录后重定向回来
    url.searchParams.set('from', pathname);
    console.log('无token，重定向到登录页:', url.toString());
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