import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * 企业微信通用验证端点
 * 支持多种参数名称和签名算法
 * 专门解决企业微信后台验证问题
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // 获取所有可能的参数名称
    const msg_signature = searchParams.get('msg_signature') || searchParams.get('signature');
    const timestamp = searchParams.get('timestamp') || searchParams.get('time');
    const nonce = searchParams.get('nonce') || searchParams.get('noncestr');
    const echostr = searchParams.get('echostr') || searchParams.get('data') || searchParams.get('echo');

    console.log('🔍 企业微信通用验证请求:', {
      url: request.url,
      msg_signature,
      timestamp,
      nonce,
      echostr: echostr ? echostr.substring(0, 20) + '...' : null,
      allParams: Object.fromEntries(searchParams.entries())
    });

    // 检查必需参数
    if (!msg_signature || !timestamp || !nonce || !echostr) {
      console.log('❌ 缺少必需参数');
      return new Response('Bad Request - Missing required parameters', { 
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // 使用固定Token（与企业微信后台配置一致）
    const token = 'L411dhQg';
    
    // 尝试多种签名算法
    const algorithms = [
      {
        name: '标准算法（字典序排序）',
        calculate: (token: string, timestamp: string, nonce: string, echostr: string) => {
          const params = [token, timestamp, nonce, echostr].sort();
          const str = params.join('');
          return createHash('sha1').update(str, 'utf8').digest('hex');
        }
      },
      {
        name: '直接拼接算法',
        calculate: (token: string, timestamp: string, nonce: string, echostr: string) => {
          const str = token + timestamp + nonce + echostr;
          return createHash('sha1').update(str, 'utf8').digest('hex');
        }
      },
      {
        name: '固定顺序算法',
        calculate: (token: string, timestamp: string, nonce: string, echostr: string) => {
          const str = timestamp + nonce + echostr + token;
          return createHash('sha1').update(str, 'utf8').digest('hex');
        }
      },
      {
        name: '小写算法',
        calculate: (token: string, timestamp: string, nonce: string, echostr: string) => {
          const params = [token, timestamp, nonce, echostr].sort();
          const str = params.join('').toLowerCase();
          return createHash('sha1').update(str, 'utf8').digest('hex');
        }
      },
      {
        name: 'URL编码算法',
        calculate: (token: string, timestamp: string, nonce: string, echostr: string) => {
          const params = [token, timestamp, nonce, encodeURIComponent(echostr)].sort();
          const str = params.join('');
          return createHash('sha1').update(str, 'utf8').digest('hex');
        }
      }
    ];

    // 尝试每种算法
    for (const algorithm of algorithms) {
      const calculatedSignature = algorithm.calculate(token, timestamp, nonce, echostr);
      
      console.log(`🔍 尝试算法: ${algorithm.name}`);
      console.log(`   计算签名: ${calculatedSignature}`);
      console.log(`   接收签名: ${msg_signature}`);
      console.log(`   匹配: ${calculatedSignature === msg_signature}`);
      
      if (calculatedSignature === msg_signature) {
        console.log(`✅ 验证成功！使用算法: ${algorithm.name}`);
        console.log('=== 返回echostr ===');
        
        // 返回echostr
        return new Response(echostr, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8'
          }
        });
      }
    }

    // 如果所有算法都失败，记录详细信息
    console.log('❌ 所有签名算法都验证失败');
    console.log('详细参数信息:', {
      token,
      timestamp,
      nonce,
      echostr,
      receivedSignature: msg_signature,
      allAlgorithms: algorithms.map(alg => ({
        name: alg.name,
        signature: alg.calculate(token, timestamp, nonce, echostr)
      }))
    });

    return new Response('Forbidden - Signature verification failed', { 
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error) {
    console.error('企业微信通用验证异常:', error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * POST请求处理
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📨 收到企业微信POST请求...');
    
    const searchParams = request.nextUrl.searchParams;
    const msg_signature = searchParams.get('msg_signature') || searchParams.get('signature');
    const timestamp = searchParams.get('timestamp') || searchParams.get('time');
    const nonce = searchParams.get('nonce') || searchParams.get('noncestr');

    console.log('POST请求参数:', {
      msg_signature,
      timestamp,
      nonce,
      url: request.url
    });

    // 获取请求体
    const body = await request.text();
    console.log('请求体:', body.substring(0, 200) + '...');

    // 返回success表示接收成功
    return new Response('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error) {
    console.error('处理POST请求出错:', error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
