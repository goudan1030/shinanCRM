import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('开始测试企业微信API连通性...');
    
    // 测试基本连通性
    const testUrl = 'https://qyapi.weixin.qq.com/cgi-bin/gettoken';
    
    console.log('测试企业微信API服务器连通性...');
    const startTime = Date.now();
    
    try {
      // 使用AbortController实现超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(testUrl + '?corpid=test&corpsecret=test', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const result = await response.json();
      
      console.log(`企业微信API响应时间: ${responseTime}ms`);
      console.log('企业微信API响应:', result);
      
      return NextResponse.json({
        success: true,
        message: '企业微信API服务器连接正常',
        responseTime: responseTime + 'ms',
        serverResponse: result,
        currentServerInfo: {
          timestamp: new Date().toISOString(),
          userAgent: 'Next.js WeChat Work Integration'
        }
      });
      
    } catch (fetchError: any) {
      console.log('企业微信API连接失败:', fetchError);
      
      return NextResponse.json({
        success: false,
        error: 'API连接失败',
        details: {
          message: fetchError.message,
          code: fetchError.code || 'UNKNOWN',
          cause: fetchError.cause?.toString() || 'Unknown cause'
        },
        suggestion: '请检查网络连接或防火墙设置'
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('连通性测试失败:', error);
    
    return NextResponse.json({
      success: false,
      error: '测试过程中发生错误',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({
    message: '请使用GET方法进行连通性测试'
  }, { status: 405 });
} 