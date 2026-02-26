import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

/**
 * 企业微信验证诊断工具
 * 用于排查验证失败的详细原因
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const msg_signature = searchParams.get('msg_signature');
  const timestamp = searchParams.get('timestamp');
  const nonce = searchParams.get('nonce');
  const echostr = searchParams.get('echostr'); // Next.js自动解码URL参数

  // 记录所有请求详情
  const requestInfo = {
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    parameters: { msg_signature, timestamp, nonce, echostr },
    rawUrl: request.url, // 原始URL
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        request.headers.get('cf-connecting-ip') || 
        'unknown'
  };

  console.log('🔍 企业微信验证诊断:', {
    ...requestInfo,
    echostr_decoded: echostr,
    echostr_length: echostr?.length || 0
  });

  // 返回详细的诊断信息
  const diagnosticInfo = {
    status: 'diagnosis',
    request: requestInfo,
    server: {
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: Date.now(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    validation: {
      hasAllParams: !!(msg_signature && timestamp && nonce && echostr),
      paramLengths: {
        msg_signature: msg_signature?.length || 0,
        timestamp: timestamp?.length || 0,
        nonce: nonce?.length || 0,
        echostr: echostr?.length || 0
      }
    }
  };

  // 如果有完整参数，进行签名验证
  if (msg_signature && timestamp && nonce && echostr) {
    const token = 'L411dhQg';
    // Next.js的searchParams.get()已经自动解码了URL参数
    const params = [token, timestamp, nonce, echostr].sort();
    const str = params.join('');
    const hash = createHash('sha1').update(str, 'utf8').digest('hex');
    
    (diagnosticInfo as any).validation = {
      ...diagnosticInfo.validation,
      token: token,
      sortedParams: params,
      joinedString: str,
      calculatedHash: hash,
      receivedSignature: msg_signature,
      isValid: hash === msg_signature,
      signatureMatch: hash === msg_signature,
      echostr_raw: echostr,
      echostr_processed: echostr
    };

    // 如果验证成功，返回 echostr
    if (hash === msg_signature) {
      console.log('✅ 诊断验证成功，返回echostr:', echostr);
      return new Response(echostr, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Diagnosis': 'success'
        }
      });
    } else {
      console.log('❌ 诊断验证失败:', {
        calculated: hash,
        received: msg_signature,
        echostr: echostr
      });
    }
  }

  // 返回诊断信息（JSON格式）
  return new Response(JSON.stringify(diagnosticInfo, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
} 