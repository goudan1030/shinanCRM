import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getWecomConfig, getWecomAccessToken, sendWecomMessage } from '@/lib/wecom-api';
import { executeQuery } from '@/lib/database-netlify';

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

    console.log('🔍 企业微信URL验证请求:', { 
      msg_signature, 
      timestamp, 
      nonce, 
      echostr: echostr ? echostr.substring(0, 10) + '...' : null,
      url: request.url 
    });

    // 检查必需参数
    if (!msg_signature || !timestamp || !nonce || !echostr) {
      console.log('❌ 缺少必需参数，返回200状态');
      // 企业微信可能会先发送无参数的请求来检查URL可达性
      return new Response('success', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

    // 从数据库获取Token
    const [configRows] = await executeQuery('SELECT token FROM wecom_config WHERE id = 1');
    const token = configRows[0]?.token || 'L411dhQg';
    console.log('🔑 使用Token:', token);
    const isValid = verifyWecomURL(token, timestamp, nonce, echostr, msg_signature);
    
    if (isValid) {
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

    // 从数据库获取Token
    const [configRows] = await executeQuery('SELECT token FROM wecom_config WHERE id = 1');
    const token = configRows[0]?.token || 'L411dhQg';
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
 * 验证企业微信签名（严格按照官方文档）
 */
function verifySignature(token: string, timestamp: string | null, nonce: string | null, data: string | null, signature: string | null): boolean {
  if (!timestamp || !nonce || !data || !signature) {
    console.log('❌ 签名验证失败：缺少必需参数', { timestamp: !!timestamp, nonce: !!nonce, data: !!data, signature: !!signature });
    return false;
  }

  try {
    // 按照企业微信官方文档：将token、timestamp、nonce、echostr四个参数进行字典序排序
    const arr = [token, timestamp, nonce, data].sort();
    const str = arr.join('');
    
    console.log('签名验证详情:', {
      token,
      timestamp,
      nonce,
      data: data.substring(0, 20) + '...',
      sortedArray: arr,
      joinedString: str.length > 100 ? str.substring(0, 100) + '...' : str
    });
    
    // 使用SHA1加密
    const hash = createHash('sha1').update(str, 'utf8').digest('hex').toLowerCase();
    const receivedSig = signature.toLowerCase();
    
    console.log('签名对比:', {
      calculated: hash,
      received: receivedSig,
      match: hash === receivedSig
    });
    
    return hash === receivedSig;
  } catch (error) {
    console.error('签名验证过程出错:', error);
    return false;
  }
}

/**
 * 企业微信URL验证专用函数（简化版本）
 */
function verifyWecomURL(token: string, timestamp: string, nonce: string, echostr: string, signature: string): boolean {
  try {
    // 企业微信URL验证的签名算法
    const arr = [token, timestamp, nonce, echostr].sort();
    const str = arr.join('');
    
    console.log('URL验证详情:', {
      token,
      timestamp,
      nonce,
      echostr: echostr.substring(0, 20) + '...',
      sortedArray: arr,
      joinedString: str
    });
    
    const hash = createHash('sha1').update(str, 'utf8').digest('hex').toLowerCase();
    const receivedSig = signature.toLowerCase();
    
    console.log('URL验证签名对比:', {
      calculated: hash,
      received: receivedSig,
      match: hash === receivedSig
    });
    
    return hash === receivedSig;
  } catch (error) {
    console.error('URL验证过程出错:', error);
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

    // 检查是否是帮助请求
    if (isHelpRequest(userMessage)) {
      await sendHelpMessage(FromUserName, AgentID);
      return;
    }

    // 智能识别会员编号
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
 * 检查是否是帮助请求
 */
function isHelpRequest(message: string): boolean {
  const helpKeywords = ['帮助', 'help', '使用说明', '怎么用', '说明', '?', '？'];
  return helpKeywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
}

/**
 * 智能识别会员编号 - 增强版
 */
function extractMemberNumber(text: string): string | null {
  // 清理文本，移除多余空格和特殊字符
  const cleanText = text.replace(/[^\w\d]/g, ' ').trim();
  
  // 匹配各种可能的会员编号格式
  const patterns = [
    /M\d+/i,                    // M17071, M12345
    /\b\d{4,6}\b/,              // 10921, 12345 (4-6位数字)
    /\b\d{1,2}[A-Z]\d+/i,       // 1A123, 2B456
    /[A-Z]\d{4,}/i,             // A1234, B5678
    /\b[A-Z]\d{3,}\b/i,         // A123, B456 (字母+3位以上数字)
    /\b\d{3,}[A-Z]\b/i,         // 123A, 456B (3位以上数字+字母)
  ];
  
  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const number = match[0].toUpperCase();
      console.log(`匹配到编号格式: ${pattern.source} -> ${number}`);
      return number;
    }
  }
  
  // 如果没有匹配到标准格式，尝试提取纯数字
  const numbers = cleanText.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    const number = numbers[0];
    if (number.length >= 3 && number.length <= 8) {
      console.log(`提取到纯数字编号: ${number}`);
      return number;
    }
  }
  
  return null;
}

/**
 * 根据编号查询会员信息 - 使用统一的数据库连接
 */
async function getMemberByNumber(memberNumber: string): Promise<any> {
  try {
    console.log(`开始查询会员编号: ${memberNumber}`);
    
    // 支持多种查询方式
    const queries = [
      {
        sql: 'SELECT * FROM members WHERE member_no = ? AND deleted = 0',
        params: [memberNumber],
        desc: '精确匹配member_no'
      },
      {
        sql: 'SELECT * FROM members WHERE UPPER(member_no) = ? AND deleted = 0',
        params: [memberNumber.toUpperCase()],
        desc: '大写匹配member_no'
      },
      {
        sql: 'SELECT * FROM members WHERE id = ? AND deleted = 0',
        params: [memberNumber],
        desc: '按ID查询'
      },
      {
        sql: 'SELECT * FROM members WHERE member_no LIKE ? AND deleted = 0',
        params: [`%${memberNumber}%`],
        desc: '模糊匹配member_no'
      }
    ];
    
    for (const query of queries) {
      try {
        const [rows] = await executeQuery(query.sql, query.params);
        const members = rows as any[];
        
        console.log(`查询方式: ${query.desc}, 结果数量: ${members.length}`);
        
        if (members.length > 0) {
          console.log(`✓ 找到会员信息: ${members[0].member_no || members[0].id}`);
          return members[0];
        }
      } catch (error) {
        console.error(`查询方式 ${query.desc} 失败:`, error);
        continue;
      }
    }
    
    console.log(`❌ 未找到会员编号: ${memberNumber}`);
    return null;
  } catch (error) {
    console.error('查询会员信息出错:', error);
    return null;
  }
}

/**
 * 发送会员详细信息给用户 - 优化版
 */
async function sendMemberInfoToUser(userId: string, memberInfo: any, agentId: string): Promise<void> {
  try {
    const config = await getWecomConfig();
    if (!config) {
      console.error('无法获取企业微信配置');
      return;
    }

    const accessToken = await getWecomAccessToken(config);
    if (!accessToken) {
      console.error('无法获取企业微信访问令牌');
      return;
    }

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

    const success = await sendWecomMessage(accessToken, message);
    if (success) {
      console.log(`✓ 已成功发送会员信息给用户 ${userId}`);
    } else {
      console.error(`✗ 发送会员信息给用户 ${userId} 失败`);
    }
    
  } catch (error) {
    console.error('发送会员信息出错:', error);
  }
}

/**
 * 发送未找到消息 - 优化版
 */
async function sendNotFoundMessage(userId: string, memberNumber: string, agentId: string): Promise<void> {
  try {
    const config = await getWecomConfig();
    if (!config) {
      console.error('无法获取企业微信配置');
      return;
    }

    const accessToken = await getWecomAccessToken(config);
    if (!accessToken) {
      console.error('无法获取企业微信访问令牌');
      return;
    }

    const message = {
      touser: userId,
      msgtype: 'text' as const,
      agentid: agentId,
      text: {
        content: `❌ 未找到会员编号为 "${memberNumber}" 的会员信息。

🔍 可能的原因：
• 编号输入错误
• 会员已被删除
• 编号格式不正确

💡 请尝试：
• 检查编号是否正确
• 使用其他格式的编号
• 发送 "帮助" 查看使用说明

📞 如有问题请联系管理员`
      }
    };

    const success = await sendWecomMessage(accessToken, message);
    if (success) {
      console.log(`✓ 已发送未找到消息给用户 ${userId}`);
    } else {
      console.error(`✗ 发送未找到消息给用户 ${userId} 失败`);
    }
    
  } catch (error) {
    console.error('发送未找到消息出错:', error);
  }
}

/**
 * 发送使用帮助 - 优化版
 */
async function sendHelpMessage(userId: string, agentId: string): Promise<void> {
  try {
    const config = await getWecomConfig();
    if (!config) {
      console.error('无法获取企业微信配置');
      return;
    }

    const accessToken = await getWecomAccessToken(config);
    if (!accessToken) {
      console.error('无法获取企业微信访问令牌');
      return;
    }

    const helpText = `💡 会员查询使用说明

🔍 查询方式：
直接发送会员编号即可查询详细信息

📝 支持的编号格式：
• M17071（M+数字）
• 10921（纯数字4-6位）
• A1234（字母+数字）
• 1A123（数字+字母+数字）

📋 使用示例：
发送：M17071
发送：10921
发送：A1234
发送：查询 M17071

🎯 返回信息包括：
• 基本信息（编号、类型、状态、性别、年龄等）
• 教育职业（学历、职业）
• 地区信息（所在地、户口所在地、目标区域）
• 基本条件（房车情况、婚史、性取向）
• 婚恋意向（孩子需求、领证需求）
• 个人描述（自我介绍、择偶要求）
• 时间信息（注册时间、更新时间）

💬 其他功能：
发送 "帮助" 或 "?" 查看此说明

📞 如有问题请联系管理员`;

    const message = {
      touser: userId,
      msgtype: 'text' as const,
      agentid: agentId,
      text: {
        content: helpText
      }
    };

    const success = await sendWecomMessage(accessToken, message);
    if (success) {
      console.log(`✓ 已发送帮助信息给用户 ${userId}`);
    } else {
      console.error(`✗ 发送帮助信息给用户 ${userId} 失败`);
    }
    
  } catch (error) {
    console.error('发送帮助信息出错:', error);
  }
}

/**
 * 格式化会员详细信息用于回复 - 优化版
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
    updated_at,
    phone,
    nickname
  } = memberInfo;

  // 格式化各种枚举值
  const genderText = gender === 'male' ? '男' : gender === 'female' ? '女' : gender === 'other' ? '其他' : '未知';
  
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

  // 计算年龄
  const age = birth_year ? (new Date().getFullYear() - birth_year) : null;
  const ageText = age ? `${age}岁` : '未填写';

  return `📋 会员详细信息

🆔 基本信息
• 会员编号：${member_no || '未分配'}
• 会员类型：${typeText}
• 状态：${statusText}
• 性别：${genderText}
• 年龄：${ageText}
• 身高：${height ? height + 'cm' : '未填写'}
• 体重：${weight ? weight + 'kg' : '未填写'}
• 昵称：${nickname || '未填写'}
• 手机：${phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '未填写'}

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
✅ 查询完成 | 编号：${member_no || '未知'}`;
} 