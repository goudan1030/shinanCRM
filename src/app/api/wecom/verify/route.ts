import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * 企业微信URL验证专用接口
 * 简化版本，专门用于解决回调地址验证问题
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== 企业微信URL验证开始 ===');
    
    const searchParams = request.nextUrl.searchParams;
    const msg_signature = searchParams.get('msg_signature');
    const timestamp = searchParams.get('timestamp');
    const nonce = searchParams.get('nonce');
    const echostr = searchParams.get('echostr');

    console.log('验证参数:', {
      msg_signature,
      timestamp,
      nonce,
      echostr: echostr ? `${echostr.substring(0, 10)}...` : null,
      url: request.url
    });

    // 检查必需参数
    if (!msg_signature || !timestamp || !nonce || !echostr) {
      console.log('❌ 缺少必需参数');
      return NextResponse.json({ 
        error: '缺少必需参数',
        received: { msg_signature: !!msg_signature, timestamp: !!timestamp, nonce: !!nonce, echostr: !!echostr }
      }, { status: 400 });
    }

    // 获取Token
    const token = process.env.WECOM_TOKEN || 'L411dhQg';
    console.log('使用Token:', token);

    // 验证签名
    const isValid = verifyWecomSignature(token, timestamp, nonce, echostr, msg_signature);
    
    if (isValid) {
      console.log('✅ 企业微信URL验证成功');
      console.log('=== 返回echostr ===');
      return new Response(echostr, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    } else {
      console.log('❌ 企业微信URL验证失败');
      return NextResponse.json({ 
        error: '签名验证失败',
        debug: {
          token,
          timestamp,
          nonce,
          echostr: echostr.substring(0, 20) + '...',
          expectedSignature: calculateWecomSignature(token, timestamp, nonce, echostr),
          receivedSignature: msg_signature
        }
      }, { status: 403 });
    }
    
  } catch (error) {
    console.error('❌ 企业微信URL验证异常:', error);
    return NextResponse.json({ 
      error: '验证过程出错',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

/**
 * 企业微信签名验证（严格按照官方文档实现）
 */
function verifyWecomSignature(token: string, timestamp: string, nonce: string, echostr: string, signature: string): boolean {
  try {
    const expectedSignature = calculateWecomSignature(token, timestamp, nonce, echostr);
    const isValid = expectedSignature === signature;
    
    console.log('签名验证详情:', {
      token,
      timestamp,
      nonce,
      echostr: echostr.substring(0, 20) + '...',
      expectedSignature,
      receivedSignature: signature,
      isValid
    });
    
    return isValid;
  } catch (error) {
    console.error('签名验证过程出错:', error);
    return false;
  }
}

/**
 * 计算企业微信签名
 */
function calculateWecomSignature(token: string, timestamp: string, nonce: string, echostr: string): string {
  // 按照企业微信文档：将token、timestamp、nonce、echostr四个参数进行字典序排序
  const arr = [token, timestamp, nonce, echostr].sort();
  const str = arr.join('');
  
  console.log('签名计算:', {
    sortedArray: arr,
    joinedString: str.length > 100 ? str.substring(0, 100) + '...' : str
  });
  
  // 使用SHA1加密
  const hash = createHash('sha1').update(str, 'utf8').digest('hex');
  
  console.log('计算得到的签名:', hash);
  
  return hash;
}

/**
 * 测试接口 - 用于调试
 */
export async function POST(request: NextRequest) {
  try {
    const { token, timestamp, nonce, echostr, signature } = await request.json();
    
    const calculatedSignature = calculateWecomSignature(token, timestamp, nonce, echostr);
    const isValid = calculatedSignature === signature;
    
    return NextResponse.json({
      success: true,
      input: { token, timestamp, nonce, echostr, signature },
      calculatedSignature,
      isValid,
      debug: {
        sortedArray: [token, timestamp, nonce, echostr].sort(),
        joinedString: [token, timestamp, nonce, echostr].sort().join('')
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '测试失败'
    }, { status: 500 });
  }
} 