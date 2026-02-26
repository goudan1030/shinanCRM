import { NextRequest, NextResponse } from 'next/server';
import { createWecomCrypto } from '@/lib/wecom-crypto';
import { parseWecomXML, validateWecomXML, cleanXML } from '@/lib/wecom-xml-parser';
import { executeQuery } from '@/lib/database-netlify';
import { wecomLogger } from '@/lib/wecom-logger';

/**
 * 第三方应用数据回调API
 * 
 * 用于接收托管企业微信应用的用户消息、进入应用事件、通讯录变更事件
 * 参考文档：https://developer.work.weixin.qq.com/tutorial/detail/38
 */

/**
 * GET请求 - 用于验证回调URL的有效性
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const msg_signature = searchParams.get('msg_signature');
    const timestamp = searchParams.get('timestamp');
    const nonce = searchParams.get('nonce');
    const echostr = searchParams.get('echostr');

    console.log('🔍 第三方应用数据回调验证请求:', { 
      msg_signature, 
      timestamp, 
      nonce, 
      echostr: echostr ? echostr.substring(0, 10) + '...' : null,
      url: request.url 
    });

    // 检查必需参数
    if (!msg_signature || !timestamp || !nonce || !echostr) {
      console.log('❌ 缺少必需参数，返回200状态');
      return new Response('success', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // 从数据库获取配置
    const [configRows] = await executeQuery('SELECT token, encoding_aes_key, corp_id FROM wecom_config WHERE id = 1');
    const config = configRows[0];
    
    if (!config) {
      console.log('❌ 未找到企业微信配置');
      return NextResponse.json({ error: '配置不存在' }, { status: 500 });
    }

    // 创建加解密实例
    const crypto = createWecomCrypto(config.token, config.encoding_aes_key, config.corp_id);
    
    // 验证签名
    const isValid = crypto.verifySignature(config.token, timestamp, nonce, echostr, msg_signature);
    
    if (!isValid) {
      console.log('✗ 签名验证失败');
      return NextResponse.json({ error: '签名验证失败' }, { status: 403 });
    }

    // 解密echostr
    try {
      const { message, corpId } = crypto.decrypt(config.encoding_aes_key, echostr);
      
      // 验证企业ID
      if (!crypto.verifyCorpId(corpId)) {
        console.log('✗ 企业ID验证失败');
        return NextResponse.json({ error: '企业ID验证失败' }, { status: 403 });
      }

      console.log('✓ 第三方应用数据回调验证成功');
      wecomLogger.logUrlVerification({
        msg_signature,
        timestamp,
        nonce,
        echostr,
        success: true
      });

      // 返回解密后的消息
      return new Response(message, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    } catch (error) {
      console.error('解密失败:', error);
      return NextResponse.json({ error: '解密失败' }, { status: 500 });
    }

  } catch (error) {
    console.error('第三方应用数据回调验证出错:', error);
    return NextResponse.json({ error: '验证过程出错' }, { status: 500 });
  }
}

/**
 * POST请求 - 用于接收实际的业务数据
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📨 收到第三方应用数据回调...');
    
    const searchParams = request.nextUrl.searchParams;
    const msg_signature = searchParams.get('msg_signature');
    const timestamp = searchParams.get('timestamp');
    const nonce = searchParams.get('nonce');

    // 获取消息内容
    const body = await request.text();
    console.log('收到加密消息体:', body.substring(0, 200) + '...');

    // 从数据库获取配置
    const [configRows] = await executeQuery('SELECT token, encoding_aes_key, corp_id FROM wecom_config WHERE id = 1');
    const config = configRows[0];
    
    if (!config) {
      console.log('❌ 未找到企业微信配置');
      return NextResponse.json({ error: '配置不存在' }, { status: 500 });
    }

    // 创建加解密实例
    const crypto = createWecomCrypto(config.token, config.encoding_aes_key, config.corp_id);

    // 解析XML获取加密消息
    const cleanedXML = cleanXML(body);
    if (!validateWecomXML(cleanedXML)) {
      console.log('❌ XML格式验证失败');
      return new Response('success');
    }

    const xmlData = parseWecomXML(cleanedXML);
    if (!xmlData || !xmlData.Encrypt) {
      console.log('❌ 未找到加密消息');
      return new Response('success');
    }

    // 验证签名
    const signature = crypto.getSignature(config.token, timestamp, nonce, xmlData.Encrypt);
    if (signature !== msg_signature) {
      console.log('✗ 签名验证失败');
      return NextResponse.json({ error: '签名验证失败' }, { status: 403 });
    }

    // 解密消息
    try {
      const { message, corpId } = crypto.decrypt(config.encoding_aes_key, xmlData.Encrypt);
      
      // 验证企业ID
      if (!crypto.verifyCorpId(corpId)) {
        console.log('✗ 企业ID验证失败');
        return NextResponse.json({ error: '企业ID验证失败' }, { status: 403 });
      }

      console.log('解密后的消息:', message.substring(0, 200) + '...');

      // 解析解密后的XML消息
      const messageData = parseWecomXML(message);
      if (!messageData) {
        console.log('❌ 解密消息解析失败');
        return new Response('success');
      }

      console.log('解析的消息数据:', messageData);

      // 处理不同类型的消息
      await handleThirdPartyMessage(messageData);

      wecomLogger.logMessageReceived({
        msg_signature,
        timestamp,
        nonce,
        msgType: messageData.MsgType,
        fromUser: messageData.FromUserName,
        content: messageData.Content,
        success: true
      });

      return new Response('success');
      
    } catch (error) {
      console.error('解密消息失败:', error);
      return NextResponse.json({ error: '解密失败' }, { status: 500 });
    }

  } catch (error) {
    console.error('处理第三方应用数据回调出错:', error);
    return NextResponse.json({ error: '处理消息出错' }, { status: 500 });
  }
}

/**
 * 处理第三方应用消息
 */
async function handleThirdPartyMessage(messageData: any): Promise<void> {
  try {
    const { MsgType, FromUserName, Content, Event, AgentID } = messageData;

    console.log(`处理第三方应用消息: ${MsgType}`);

    switch (MsgType) {
      case 'text':
        // 处理文本消息
        await handleTextMessage(FromUserName, Content, AgentID);
        break;
      
      case 'event':
        // 处理事件消息
        await handleEventMessage(FromUserName, Event, AgentID);
        break;
      
      default:
        console.log(`未处理的消息类型: ${MsgType}`);
    }
  } catch (error) {
    console.error('处理第三方应用消息出错:', error);
  }
}

/**
 * 处理文本消息
 */
async function handleTextMessage(fromUser: string, content: string, agentId: string): Promise<void> {
  try {
    console.log(`用户 ${fromUser} 发送消息: ${content}`);

    // 这里可以调用现有的会员查询逻辑
    // 暂时记录日志
    wecomLogger.info('收到第三方应用文本消息', {
      fromUser,
      content: content.substring(0, 50) + '...',
      agentId
    });
  } catch (error) {
    console.error('处理文本消息出错:', error);
  }
}

/**
 * 处理事件消息
 */
async function handleEventMessage(fromUser: string, event: string, agentId: string): Promise<void> {
  try {
    console.log(`收到事件消息: ${event} from ${fromUser}`);

    wecomLogger.info('收到第三方应用事件消息', {
      fromUser,
      event,
      agentId
    });
  } catch (error) {
    console.error('处理事件消息出错:', error);
  }
} 