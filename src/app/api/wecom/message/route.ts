import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getWecomConfig, getWecomAccessToken, sendWecomMessage } from '@/lib/wecom-api';
import pool from '@/lib/mysql';

/**
 * 企业微信消息接收API
 * GET: 验证URL有效性
 * POST: 接收并处理用户消息
 */

/**
 * 验证企业微信URL - GET请求
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const msg_signature = searchParams.get('msg_signature');
    const timestamp = searchParams.get('timestamp');
    const nonce = searchParams.get('nonce');
    const echostr = searchParams.get('echostr');

    console.log('企业微信URL验证请求:', { msg_signature, timestamp, nonce, echostr });

    // 检查必需参数
    if (!msg_signature || !timestamp || !nonce || !echostr) {
      console.log('✗ 缺少必需参数');
      return NextResponse.json({ error: '缺少必需参数' }, { status: 400 });
    }

    // 验证签名（直接使用Token，不依赖数据库配置）
    const token = process.env.WECOM_TOKEN || 'L411dhQg';
    const signature = verifySignature(token, timestamp, nonce, echostr, msg_signature);
    
    if (signature) {
      console.log('✓ 企业微信URL验证成功');
      return new Response(echostr, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    } else {
      console.log('✗ 企业微信URL验证失败');
      return NextResponse.json({ error: '签名验证失败' }, { status: 403 });
    }
  } catch (error) {
    console.error('企业微信URL验证出错:', error);
    return NextResponse.json({ error: '验证过程出错' }, { status: 500 });
  }
}

/**
 * 接收企业微信消息 - POST请求
 */
export async function POST(request: NextRequest) {
  try {
    console.log('收到企业微信消息推送...');
    
    const searchParams = request.nextUrl.searchParams;
    const msg_signature = searchParams.get('msg_signature');
    const timestamp = searchParams.get('timestamp');
    const nonce = searchParams.get('nonce');

    // 获取消息内容
    const body = await request.text();
    console.log('收到消息体:', body);

    // 验证签名
    const token = process.env.WECOM_TOKEN || 'L411dhQg';
    const signature = verifySignature(token, timestamp, nonce, body, msg_signature);
    
    if (!signature) {
      console.log('✗ 消息签名验证失败');
      return NextResponse.json({ error: '签名验证失败' }, { status: 403 });
    }

    // 解析XML消息
    const messageData = parseWeChatMessage(body);
    console.log('解析的消息数据:', messageData);

    if (!messageData) {
      return new Response('success'); // 返回success表示接收成功
    }

    // 处理文本消息
    if (messageData.MsgType === 'text') {
      await handleTextMessage(messageData);
    }

    return new Response('success');
    
  } catch (error) {
    console.error('处理企业微信消息出错:', error);
    return NextResponse.json({ error: '处理消息出错' }, { status: 500 });
  }
}

/**
 * 验证企业微信签名
 */
function verifySignature(token: string, timestamp: string | null, nonce: string | null, data: string | null, signature: string | null): boolean {
  if (!timestamp || !nonce || !data || !signature) {
    return false;
  }

  try {
    const arr = [token, timestamp, nonce, data].sort();
    const str = arr.join('');
    const hash = createHash('sha1').update(str).digest('hex');
    return hash === signature;
  } catch (error) {
    console.error('签名验证出错:', error);
    return false;
  }
}

/**
 * 解析微信XML消息
 */
function parseWeChatMessage(xml: string): any {
  try {
    // 简单的XML解析 - 在生产环境中建议使用专业的XML解析库
    const result: any = {};
    
    const patterns = {
      ToUserName: /<ToUserName><!\[CDATA\[(.*?)\]\]><\/ToUserName>/,
      FromUserName: /<FromUserName><!\[CDATA\[(.*?)\]\]><\/FromUserName>/,
      CreateTime: /<CreateTime>(\d+)<\/CreateTime>/,
      MsgType: /<MsgType><!\[CDATA\[(.*?)\]\]><\/MsgType>/,
      Content: /<Content><!\[CDATA\[(.*?)\]\]><\/Content>/,
      MsgId: /<MsgId>(\d+)<\/MsgId>/,
      AgentID: /<AgentID>(\d+)<\/AgentID>/
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = xml.match(pattern);
      if (match) {
        result[key] = match[1];
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    console.error('解析XML消息出错:', error);
    return null;
  }
}

/**
 * 处理文本消息
 */
async function handleTextMessage(messageData: any): Promise<void> {
  try {
    const { FromUserName, Content, AgentID } = messageData;
    const userMessage = Content?.trim();

    console.log(`用户 ${FromUserName} 发送消息: ${userMessage}`);

    if (!userMessage) {
      return;
    }

    // 识别会员编号
    const memberNumber = extractMemberNumber(userMessage);
    
    if (memberNumber) {
      console.log(`识别到会员编号: ${memberNumber}`);
      
      // 查询会员信息
      const memberInfo = await getMemberByNumber(memberNumber);
      
      if (memberInfo) {
        // 发送会员详细信息
        await sendMemberInfoToUser(FromUserName, memberInfo, AgentID);
      } else {
        // 发送未找到消息
        await sendNotFoundMessage(FromUserName, memberNumber, AgentID);
      }
    } else {
      // 发送使用帮助
      await sendHelpMessage(FromUserName, AgentID);
    }
    
  } catch (error) {
    console.error('处理文本消息出错:', error);
  }
}

/**
 * 智能识别会员编号
 */
function extractMemberNumber(text: string): string | null {
  // 匹配各种可能的会员编号格式
  const patterns = [
    /M\d+/i,           // M17071, M12345
    /\b\d{4,6}\b/,     // 10921, 12345
    /\b\d{1,2}[A-Z]\d+/i, // 1A123, 2B456
    /[A-Z]\d{4,}/i     // A1234, B5678
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].toUpperCase();
    }
  }
  
  return null;
}

/**
 * 根据编号查询会员信息
 */
async function getMemberByNumber(memberNumber: string): Promise<any> {
  try {
    // 支持多种查询方式
    const queries = [
      'SELECT * FROM members WHERE member_no = ? AND deleted = 0',
      'SELECT * FROM members WHERE UPPER(member_no) = ? AND deleted = 0',
      'SELECT * FROM members WHERE id = ? AND deleted = 0'
    ];
    
    for (const query of queries) {
      const [rows] = await pool.execute(query, [memberNumber]);
      const members = rows as any[];
      
      if (members.length > 0) {
        return members[0];
      }
    }
    
    return null;
  } catch (error) {
    console.error('查询会员信息出错:', error);
    return null;
  }
}

/**
 * 发送会员详细信息给用户
 */
async function sendMemberInfoToUser(userId: string, memberInfo: any, agentId: string): Promise<void> {
  try {
    const config = await getWecomConfig();
    if (!config) return;

    const accessToken = await getWecomAccessToken(config);
    if (!accessToken) return;

    // 格式化会员信息
    const memberDetails = formatMemberDetailsForReply(memberInfo);
    
    const message = {
      touser: userId,
      msgtype: 'text' as const,
      agentid: agentId,
      text: {
        content: memberDetails
      }
    };

    await sendWecomMessage(accessToken, message);
    console.log(`✓ 已发送会员信息给用户 ${userId}`);
    
  } catch (error) {
    console.error('发送会员信息出错:', error);
  }
}

/**
 * 发送未找到消息
 */
async function sendNotFoundMessage(userId: string, memberNumber: string, agentId: string): Promise<void> {
  try {
    const config = await getWecomConfig();
    if (!config) return;

    const accessToken = await getWecomAccessToken(config);
    if (!accessToken) return;

    const message = {
      touser: userId,
      msgtype: 'text' as const,
      agentid: agentId,
      text: {
        content: `❌ 未找到会员编号为 "${memberNumber}" 的会员信息。\n\n请检查编号是否正确，或发送 "帮助" 查看使用说明。`
      }
    };

    await sendWecomMessage(accessToken, message);
    console.log(`✓ 已发送未找到消息给用户 ${userId}`);
    
  } catch (error) {
    console.error('发送未找到消息出错:', error);
  }
}

/**
 * 发送使用帮助
 */
async function sendHelpMessage(userId: string, agentId: string): Promise<void> {
  try {
    const config = await getWecomConfig();
    if (!config) return;

    const accessToken = await getWecomAccessToken(config);
    if (!accessToken) return;

    const helpText = `💡 会员查询使用说明

🔍 发送会员编号即可查询详细信息

支持的编号格式：
• M17071（M+数字）
• 10921（纯数字）
• A1234（字母+数字）

📝 使用示例：
直接发送：M17071
直接发送：10921
直接发送：查询 M17071

💬 如有问题请联系管理员`;

    const message = {
      touser: userId,
      msgtype: 'text' as const,
      agentid: agentId,
      text: {
        content: helpText
      }
    };

    await sendWecomMessage(accessToken, message);
    console.log(`✓ 已发送帮助信息给用户 ${userId}`);
    
  } catch (error) {
    console.error('发送帮助信息出错:', error);
  }
}

/**
 * 格式化会员详细信息用于回复
 */
function formatMemberDetailsForReply(memberInfo: any): string {
  const {
    member_no,
    gender,
    birth_year,
    height,
    weight,
    education,
    occupation,
    province,
    city,
    district,
    hukou_province,
    hukou_city,
    target_area,
    house_car,
    marriage_history,
    sexual_orientation,
    children_plan,
    marriage_cert,
    self_description,
    partner_requirement,
    status,
    type,
    created_at,
    updated_at
  } = memberInfo;

  // 格式化各种枚举值
  const genderText = gender === 'male' ? '男' : gender === 'female' ? '女' : '未知';
  
  const educationMap: {[key: string]: string} = {
    'PRIMARY_SCHOOL': '小学',
    'MIDDLE_SCHOOL': '初中',
    'HIGH_SCHOOL': '高中',
    'JUNIOR_COLLEGE': '大专',
    'BACHELOR': '本科',
    'MASTER': '硕士',
    'DOCTOR': '博士'
  };
  const educationText = education ? educationMap[education] || education : '未填写';
  
  const houseCarMap: {[key: string]: string} = {
    'NEITHER': '无房无车',
    'HOUSE_ONLY': '有房无车',
    'CAR_ONLY': '有车无房',
    'BOTH': '有房有车'
  };
  const houseCarText = house_car ? houseCarMap[house_car] || house_car : '未填写';
  
  const childrenPlanMap: {[key: string]: string} = {
    'NONE': '不要孩子',
    'SEPARATE': '各自要',
    'BOTH': '一起要',
    'NEGOTIATE': '协商'
  };
  const childrenPlanText = children_plan ? childrenPlanMap[children_plan] || children_plan : '未填写';
  
  const marriageCertMap: {[key: string]: string} = {
    'DONT_WANT': '不想领证',
    'WANT': '想领证',
    'NEGOTIATE': '互相协商'
  };
  const marriageCertText = marriage_cert ? marriageCertMap[marriage_cert] || marriage_cert : '未填写';

  const statusMap: {[key: string]: string} = {
    'ACTIVE': '活跃',
    'INACTIVE': '非活跃', 
    'REVOKED': '已撤销'
  };
  const statusText = status ? statusMap[status] || status : '未知';

  const typeMap: {[key: string]: string} = {
    'NORMAL': '普通会员',
    'VIP': 'VIP会员',
    'ONE_TIME': '一次性会员',
    'ANNUAL': '年费会员'
  };
  const typeText = type ? typeMap[type] || type : '未知';

  const createdTime = created_at ? new Date(created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '未知';
  const updatedTime = updated_at ? new Date(updated_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '未知';

  return `📋 会员详细信息

🆔 基本信息
• 会员编号：${member_no || '未分配'}
• 会员类型：${typeText}
• 状态：${statusText}
• 性别：${genderText}
• 出生年份：${birth_year ? birth_year + '年' : '未填写'}
• 身高：${height ? height + 'cm' : '未填写'}
• 体重：${weight ? weight + 'kg' : '未填写'}

🎓 教育职业
• 学历：${educationText}
• 职业：${occupation || '未填写'}

📍 地区信息
• 所在地：${[province, city, district].filter(Boolean).join(' ') || '未填写'}
• 户口所在地：${[hukou_province, hukou_city].filter(Boolean).join(' ') || '未填写'}
• 目标区域：${target_area || '未填写'}

💼 基本条件
• 房车情况：${houseCarText}
• 婚史：${marriage_history || '未填写'}
• 性取向：${sexual_orientation || '未填写'}

👨‍👩‍👧‍👦 婚恋意向
• 孩子需求：${childrenPlanText}
• 领证需求：${marriageCertText}

💭 个人说明
${self_description || '未填写'}

💕 择偶要求
${partner_requirement || '未填写'}

📅 时间信息
• 注册时间：${createdTime}
• 更新时间：${updatedTime}

---
查询完成 ✓`;
} 