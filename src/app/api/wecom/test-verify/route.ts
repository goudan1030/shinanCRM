import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * 企业微信URL验证测试工具
 * 模拟企业微信的验证请求，用于调试
 */
export async function POST(request: NextRequest) {
  try {
    const { baseUrl } = await request.json();
    
    if (!baseUrl) {
      return NextResponse.json({
        success: false,
        error: '请提供baseUrl参数'
      }, { status: 400 });
    }

    // 生成测试参数
    const token = 'L411dhQg';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).substring(2, 15);
    const echostr = Math.random().toString(36).substring(2, 32);

    // 计算签名
    const signature = calculateSignature(token, timestamp, nonce, echostr);

    // 构造测试URL
    const testUrl = `${baseUrl}?msg_signature=${signature}&timestamp=${timestamp}&nonce=${nonce}&echostr=${echostr}`;

    console.log('生成测试URL:', testUrl);
    console.log('测试参数:', { token, timestamp, nonce, echostr, signature });

    // 发送测试请求
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'WeChat/Enterprise'
        }
      });

      const responseText = await response.text();
      
      const result = {
        success: true,
        test: {
          url: testUrl,
          parameters: { token, timestamp, nonce, echostr, signature },
          response: {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
            headers: Object.fromEntries(response.headers.entries())
          },
          validation: {
            expectedEchostr: echostr,
            receivedEchostr: responseText,
            isValid: responseText === echostr
          }
        }
      };

      return NextResponse.json(result);

    } catch (fetchError) {
      return NextResponse.json({
        success: false,
        error: '测试请求失败',
        details: fetchError instanceof Error ? fetchError.message : '未知错误',
        testParameters: { token, timestamp, nonce, echostr, signature },
        testUrl
      }, { status: 500 });
    }

  } catch (error) {
    console.error('测试工具出错:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '测试失败'
    }, { status: 500 });
  }
}

/**
 * 计算企业微信签名
 */
function calculateSignature(token: string, timestamp: string, nonce: string, echostr: string): string {
  const arr = [token, timestamp, nonce, echostr].sort();
  const str = arr.join('');
  return createHash('sha1').update(str, 'utf8').digest('hex');
}

/**
 * 获取验证工具说明
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    description: '企业微信URL验证测试工具',
    usage: {
      method: 'POST',
      body: {
        baseUrl: 'https://admin.xinghun.info/api/wecom/verify'
      }
    },
    example: `
curl -X POST https://admin.xinghun.info/api/wecom/test-verify \\
  -H "Content-Type: application/json" \\
  -d '{"baseUrl": "https://admin.xinghun.info/api/wecom/verify"}'
    `.trim(),
    availableEndpoints: [
      'https://admin.xinghun.info/api/wecom/verify',
      'https://admin.xinghun.info/api/wecom/message'
    ]
  });
} 