import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: '测试API无需认证访问成功',
    timestamp: new Date().toISOString(),
    path: '/api/wecom/test-auth'
  });
} 