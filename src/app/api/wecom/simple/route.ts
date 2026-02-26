import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const msg_signature = url.searchParams.get('msg_signature');
    const timestamp = url.searchParams.get('timestamp');
    const nonce = url.searchParams.get('nonce');
    const echostr = url.searchParams.get('echostr');

    if (!msg_signature || !timestamp || !nonce || !echostr) {
      return new Response('Missing parameters', { status: 400 });
    }

    const token = 'L411dhQg';
    
    // 最简单的签名验证
    const sortedParams = [token, timestamp, nonce, echostr].sort();
    const signatureString = sortedParams.join('');
    const signature = createHash('sha1').update(signatureString).digest('hex');

    if (signature === msg_signature) {
      // 直接返回echostr，不解码，不加任何头
      return new Response(echostr);
    } else {
      return new Response('Signature verification failed', { status: 403 });
    }
  } catch (error) {
    return new Response('Error', { status: 500 });
  }
} 