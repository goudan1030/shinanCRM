import { NextRequest, NextResponse } from 'next/server';

// 复制middleware中的路径匹配逻辑进行测试
const publicRoutes = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/debug/db-test',
  '/favicon.ico',
  '/_next',
  '/WW_verify_',
];

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

function isPublicPath(path: string): boolean {
  const isGeneralPublic = publicRoutes.some(route => path.startsWith(route) || path === route);
  const isWecomPublic = wecomPublicRoutes.some(route => path.startsWith(route) || path === route);
  return isGeneralPublic || isWecomPublic;
}

export async function GET() {
  try {
    // 测试各种路径
    const testPaths = [
      '/api/debug/db-test',
      '/api/wecom/test-auth',
      '/api/wecom/manual-check',
      '/api/wecom/config',
      '/api/members',
      '/login'
    ];

    const results = testPaths.map(path => {
      const isGeneralPublic = publicRoutes.some(route => path.startsWith(route) || path === route);
      const isWecomPublic = wecomPublicRoutes.some(route => path.startsWith(route) || path === route);
      const finalResult = isGeneralPublic || isWecomPublic;
      
      return {
        path,
        isGeneralPublic,
        isWecomPublic,
        finalResult,
        matchedGeneralRoutes: publicRoutes.filter(route => path.startsWith(route) || path === route),
        matchedWecomRoutes: wecomPublicRoutes.filter(route => path.startsWith(route) || path === route)
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Middleware路径匹配测试',
      results,
      publicRoutes,
      wecomPublicRoutes,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('调试API错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '调试失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 