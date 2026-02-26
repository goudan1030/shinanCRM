import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

/**
 * 企业微信回调验证 - 最简化版本
 * 严格按照官方文档实现
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const msg_signature = searchParams.get('msg_signature');
    const timestamp = searchParams.get('timestamp');
    const nonce = searchParams.get('nonce');
    const echostr = searchParams.get('echostr');

    // 企业微信Token
    const token = 'L411dhQg';

    // 参数检查
    if (!msg_signature || !timestamp || !nonce || !echostr) {
      return new Response('Missing parameters', { status: 400 });
    }

    // 计算签名
    const signature = calculateSignature(token, timestamp, nonce, echostr);

    // 验证签名
    if (signature === msg_signature) {
      // 验证成功，返回echostr
      return new Response(echostr, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    } else {
      // 验证失败
      return new Response('Invalid signature', { status: 403 });
    }

  } catch (error) {
    return new Response('Server error', { status: 500 });
  }
}

/**
 * 计算企业微信签名
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