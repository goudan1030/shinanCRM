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
  '/api/middleware-debug',  // 添加middleware调试API
  '/favicon.ico',
  '/_next',
  '/WW_verify_',  // 企业微信域名验证文件
];

// 企业微信专用公开路由 - 这些API不需要认证
const wecomPublicRoutes = [
  '/api/wecom/callback',
  '/api/wecom/verify',
  '/api/wecom/manual-check',
  '/api/wecom/process-queue',
  '/api/wecom/test-auth',
  '/api/wecom/config',
  '/api/wecom/debug',
  '/api/wecom/diagnosis',
  '/api/wecom/message',
  '/api/wecom/simple',
  '/api/wecom/test-connection',
  '/api/wecom/test-notification',
  '/api/wecom/test-query'
];

// 检查路径是否匹配公开路由
function isPublicPath(path: string): boolean {
  // 检查通用公开路由
  const isGeneralPublic = publicRoutes.some(route => path.startsWith(route) || path === route);
  
  // 检查企业微信专用公开路由
  const isWecomPublic = wecomPublicRoutes.some(route => path.startsWith(route) || path === route);
  
  const result = isGeneralPublic || isWecomPublic;
  
  // 强制写入日志文件进行调试
  if (path.includes('/api/wecom/')) {
    const logMessage = `[${new Date().toISOString()}] 企业微信API路径检查: ${JSON.stringify({ 
      path, 
      isGeneralPublic,
      isWecomPublic,
      result,
      matchedGeneralRoutes: publicRoutes.filter(route => path.startsWith(route) || path === route),
      matchedWecomRoutes: wecomPublicRoutes.filter(route => path.startsWith(route) || path === route)
    })}`;
    
    // 写入到标准错误输出，确保被PM2捕获
    process.stderr.write(logMessage + '\n');
    console.error(logMessage);
  }
  
  return result;
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
  
  // 强制记录所有请求到错误输出
  const logMessage = `[${new Date().toISOString()}] 中间件处理: ${pathname} | Netlify: ${isNetlify}`;
  process.stderr.write(logMessage + '\n');
  console.error(logMessage);
  
  // 处理企业微信验证文件 - 直接返回，不做任何处理
  if (pathname.startsWith('/WW_verify_')) {
    process.stderr.write(`[${new Date().toISOString()}] 企业微信验证文件访问: ${pathname}\n`);
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
    process.stderr.write(`[${new Date().toISOString()}] 处理API请求: ${pathname}\n`);
    
    // 跳过认证检查的API路由
    const isPublic = isPublicPath(pathname);
    process.stderr.write(`[${new Date().toISOString()}] API路径公开检查结果: ${pathname} -> ${isPublic}\n`);
    
    if (isPublic) {
      process.stderr.write(`[${new Date().toISOString()}] API路径为公开路径，跳过认证: ${pathname}\n`);
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
    process.stderr.write(`[${new Date().toISOString()}] API请求认证检查: ${JSON.stringify({ 
      path: pathname, 
      hasToken: !!authToken?.value,
      tokenLength: authToken?.value?.length 
    })}\n`);
    
    if (!authToken) {
      process.stderr.write(`[${new Date().toISOString()}] API请求无认证token，返回401: ${pathname}\n`);
      return NextResponse.json(
        { 
          success: false,
          error: '未授权访问',
          message: '请先登录'
        },
        { status: 401 }
      );
    }
    
    process.stderr.write(`[${new Date().toISOString()}] API请求认证通过: ${pathname}\n`);
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
  
  process.stderr.write(`[${new Date().toISOString()}] 页面访问认证检查: ${JSON.stringify({ 
    path: pathname, 
    hasToken: !!authToken?.value,
    tokenLength: authToken?.value?.length,
    isProtected: isProtectedPath(pathname)
  })}\n`);
  
  if (!authToken) {
    // 如果没有token，重定向到登录页
    const url = new URL('/login', request.url);
    // 保存原始URL以便登录后重定向回来
    url.searchParams.set('from', pathname);
    process.stderr.write(`[${new Date().toISOString()}] 无token，重定向到登录页: ${url.toString()}\n`);
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