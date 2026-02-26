import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

/**
 * 企业微信URL验证 - 最简化版本
 * 严格按照官方文档：https://developer.work.weixin.qq.com/document/path/90930
 * 参考Spring Boot成功案例：使用最原始的响应方式
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const msg_signature = searchParams.get('msg_signature');
    const timestamp = searchParams.get('timestamp');
    const nonce = searchParams.get('nonce');
    const echostr = searchParams.get('echostr');

    console.log('🔍 最简验证请求:', { 
      msg_signature, 
      timestamp, 
      nonce, 
      echostr: echostr ? echostr.substring(0, 10) + '...' : null,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    });

    // 检查必需参数
    if (!msg_signature || !timestamp || !nonce || !echostr) {
      console.log('❌ 缺少必需参数');
      return new Response('Bad Request', { status: 400 });
    }

    // 企业微信Token
    const token = 'L411dhQg';

    // 计算签名
    const signature = calculateSignature(token, timestamp, nonce, echostr);

    console.log('🔐 签名验证:', {
      calculated: signature,
      received: msg_signature,
      match: signature === msg_signature
    });

    // 验证签名
    if (signature === msg_signature) {
      console.log('✅ 验证成功，返回echostr:', echostr);
      
      // 使用最原始的响应方式，不添加任何额外头信息
      // 参考Spring Boot成功案例：response.getWriter().print(msg)
      return new Response(echostr, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    } else {
      console.log('❌ 验证失败');
      return new Response('Forbidden', { status: 403 });
    }

  } catch (error) {
    console.error('验证过程出错:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * 计算企业微信签名
 * 严格按照官方文档实现
 */
function calculateSignature(token: string, timestamp: string, nonce: string, echostr: string): string {
  // 1. 将token、timestamp、nonce、echostr四个参数进行字典序排序
  const params = [token, timestamp, nonce, echostr].sort();
  
  // 2. 将四个参数字符串拼接成一个字符串
  const str = params.join('');
  
  // 3. 对字符串进行sha1加密
  const hash = createHash('sha1').update(str, 'utf8').digest('hex');
  
  return hash;
} 