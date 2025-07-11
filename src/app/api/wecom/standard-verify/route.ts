import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

/**
 * 企业微信URL验证 - 严格按照官方文档标准实现
 * 参考文档：https://developer.work.weixin.qq.com/document/10514
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const msg_signature = searchParams.get('msg_signature');
    const timestamp = searchParams.get('timestamp');
    const nonce = searchParams.get('nonce');
    const echostr = searchParams.get('echostr');

    console.log('🔍 企业微信官方标准验证请求:', {
      msg_signature,
      timestamp,
      nonce,
      echostr: echostr ? echostr.substring(0, 10) + '...' : null,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    });

    // 检查必需参数
    if (!msg_signature || !timestamp || !nonce || !echostr) {
      console.log('❌ 缺少必需参数');
      return new Response('Bad Request', { status: 400 });
    }

    // 使用固定Token（与企业微信后台配置一致）
    const token = 'L411dhQg';
    
    // 验证签名
    const isValid = verifyWechatSignature(token, timestamp, nonce, echostr, msg_signature);
    
    if (isValid) {
      console.log('✅ 企业微信官方验证成功');
      // 严格按照官方文档：验证成功直接返回echostr
      return new Response(echostr, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    } else {
      console.log('❌ 企业微信官方验证失败');
      return new Response('Forbidden', { status: 403 });
    }

  } catch (error) {
    console.error('企业微信官方验证异常:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * 企业微信签名验证算法
 * 严格按照官方文档实现
 */
function verifyWechatSignature(
  token: string, 
  timestamp: string, 
  nonce: string, 
  echostr: string, 
  signature: string
): boolean {
  try {
    // 1. 将token、timestamp、nonce、echostr四个参数进行字典序排序
    const params = [token, timestamp, nonce, echostr].sort();
    
    // 2. 将四个参数字符串拼接成一个字符串
    const str = params.join('');
    
    // 3. 对字符串进行sha1加密
    const hash = createHash('sha1').update(str, 'utf8').digest('hex');
    
    console.log('签名验证详情:', {
      token: token,
      timestamp: timestamp,
      nonce: nonce,
      echostr: echostr.substring(0, 20) + '...',
      sortedParams: params,
      joinedString: str.length > 100 ? str.substring(0, 100) + '...' : str,
      calculatedHash: hash,
      receivedSignature: signature,
      isMatch: hash === signature
    });
    
    return hash === signature;
    
  } catch (error) {
    console.error('签名验证计算错误:', error);
    return false;
  }
} 