/**
 * 企业微信XML解析工具库
 * 
 * 提供企业微信消息XML解析功能
 * 支持CDATA和非CDATA格式的XML解析
 */

/**
 * 企业微信消息接口
 */
export interface WecomMessage {
  ToUserName?: string;
  FromUserName?: string;
  CreateTime?: string;
  MsgType?: string;
  Content?: string;
  MsgId?: string;
  AgentID?: string;
  Event?: string;
  EventKey?: string;
}

/**
 * 解析企业微信XML消息
 * 支持CDATA和非CDATA格式
 */
export function parseWecomXML(xml: string): WecomMessage | null {
  try {
    if (!xml || typeof xml !== 'string') {
      console.log('XML内容为空或格式错误');
      return null;
    }

    const result: WecomMessage = {};
    
    // 定义解析模式 - 支持CDATA和非CDATA格式
    const patterns = {
      ToUserName: [
        /<ToUserName><!\[CDATA\[(.*?)\]\]><\/ToUserName>/,
        /<ToUserName>(.*?)<\/ToUserName>/
      ],
      FromUserName: [
        /<FromUserName><!\[CDATA\[(.*?)\]\]><\/FromUserName>/,
        /<FromUserName>(.*?)<\/FromUserName>/
      ],
      CreateTime: [
        /<CreateTime>(\d+)<\/CreateTime>/
      ],
      MsgType: [
        /<MsgType><!\[CDATA\[(.*?)\]\]><\/MsgType>/,
        /<MsgType>(.*?)<\/MsgType>/
      ],
      Content: [
        /<Content><!\[CDATA\[(.*?)\]\]><\/Content>/,
        /<Content>(.*?)<\/Content>/
      ],
      MsgId: [
        /<MsgId>(\d+)<\/MsgId>/
      ],
      AgentID: [
        /<AgentID>(\d+)<\/AgentID>/
      ],
      Event: [
        /<Event><!\[CDATA\[(.*?)\]\]><\/Event>/,
        /<Event>(.*?)<\/Event>/
      ],
      EventKey: [
        /<EventKey><!\[CDATA\[(.*?)\]\]><\/EventKey>/,
        /<EventKey>(.*?)<\/EventKey>/
      ]
    };

    // 解析每个字段
    for (const [key, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        const match = xml.match(pattern);
        if (match) {
          result[key as keyof WecomMessage] = match[1];
          break; // 找到第一个匹配就停止
        }
      }
    }

    // 验证必要字段
    if (!result.MsgType) {
      console.log('XML缺少MsgType字段');
      return null;
    }

    console.log('XML解析结果:', {
      MsgType: result.MsgType,
      FromUserName: result.FromUserName,
      Content: result.Content ? result.Content.substring(0, 50) + '...' : null,
      Event: result.Event
    });

    return result;
  } catch (error) {
    console.error('解析企业微信XML出错:', error);
    return null;
  }
}

/**
 * 验证XML格式是否正确
 */
export function validateWecomXML(xml: string): boolean {
  try {
    if (!xml || typeof xml !== 'string') {
      return false;
    }

    // 检查基本XML结构
    const hasXmlDeclaration = xml.includes('<?xml');
    const hasRootElement = xml.includes('<xml>') && xml.includes('</xml>');
    
    if (!hasRootElement) {
      console.log('XML缺少根元素<xml>');
      return false;
    }

    // 检查是否包含企业微信相关字段
    const hasWecomFields = xml.includes('MsgType') || xml.includes('FromUserName');
    
    if (!hasWecomFields) {
      console.log('XML缺少企业微信相关字段');
      return false;
    }

    return true;
  } catch (error) {
    console.error('XML格式验证出错:', error);
    return false;
  }
}

/**
 * 清理XML内容
 */
export function cleanXML(xml: string): string {
  if (!xml || typeof xml !== 'string') {
    return '';
  }

  // 移除多余的空白字符
  let cleaned = xml.trim();
  
  // 移除XML声明（如果有）
  cleaned = cleaned.replace(/<\?xml[^>]*\?>/, '');
  
  // 移除注释（如果有）
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  
  return cleaned;
}

/**
 * 生成企业微信响应XML
 */
export function generateWecomResponseXML(toUser: string, fromUser: string, content: string, msgType: string = 'text'): string {
  const timestamp = Math.floor(Date.now() / 1000);
  
  return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${timestamp}</CreateTime>
<MsgType><![CDATA[${msgType}]]></MsgType>
<Content><![CDATA[${content}]]></Content>
</xml>`;
}

/**
 * 解析企业微信事件消息
 */
export function parseWecomEvent(xml: string): { event: string; eventKey?: string } | null {
  try {
    const message = parseWecomXML(xml);
    if (!message || message.MsgType !== 'event') {
      return null;
    }

    return {
      event: message.Event || '',
      eventKey: message.EventKey
    };
  } catch (error) {
    console.error('解析企业微信事件出错:', error);
    return null;
  }
}

/**
 * 检查是否是文本消息
 */
export function isTextMessage(xml: string): boolean {
  try {
    const message = parseWecomXML(xml);
    return message?.MsgType === 'text';
  } catch (error) {
    return false;
  }
}

/**
 * 检查是否是事件消息
 */
export function isEventMessage(xml: string): boolean {
  try {
    const message = parseWecomXML(xml);
    return message?.MsgType === 'event';
  } catch (error) {
    return false;
  }
} 