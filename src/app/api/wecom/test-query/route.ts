import { NextRequest, NextResponse } from 'next/server';
import { getWecomConfig, getWecomAccessToken, sendWecomMessage } from '@/lib/wecom-api';
import { executeQuery } from '@/lib/database-netlify';

/**
 * 企业微信会员查询测试API
 * 
 * 用于测试企业微信会员查询功能
 * 可以模拟发送消息和查询会员信息
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const memberNumber = searchParams.get('number');
    const testUser = searchParams.get('user') || 'test_user';
    const agentId = searchParams.get('agent') || '1000011';

    if (!memberNumber) {
      return NextResponse.json({
        error: '请提供会员编号参数',
        usage: 'GET /api/wecom/test-query?number=M17071&user=test_user&agent=1000011'
      }, { status: 400 });
    }

    console.log(`🧪 开始测试会员查询: ${memberNumber}`);

    // 1. 测试会员编号识别
    const extractedNumber = extractMemberNumber(memberNumber);
    console.log(`识别到的编号: ${extractedNumber}`);

    // 2. 查询会员信息
    const memberInfo = await getMemberByNumber(extractedNumber || memberNumber);
    
    if (!memberInfo) {
      return NextResponse.json({
        success: false,
        message: '未找到会员信息',
        testNumber: memberNumber,
        extractedNumber
      });
    }

    // 3. 格式化会员信息
    const formattedInfo = formatMemberDetailsForReply(memberInfo);

    // 4. 尝试发送到企业微信（如果配置了）
    let wecomResult = null;
    try {
      const config = await getWecomConfig();
      if (config) {
        const accessToken = await getWecomAccessToken(config);
        if (accessToken) {
          const message = {
            touser: testUser,
            msgtype: 'text' as const,
            agentid: agentId,
            text: {
              content: formattedInfo
            }
          };
          
          const success = await sendWecomMessage(accessToken, message);
          wecomResult = { success, config: { corpId: config.corp_id, agentId: config.agent_id } };
        }
      }
    } catch (error) {
      console.error('企业微信发送失败:', error);
      wecomResult = { success: false, error: error.message };
    }

    return NextResponse.json({
      success: true,
      testNumber: memberNumber,
      extractedNumber,
      memberInfo: {
        id: memberInfo.id,
        member_no: memberInfo.member_no,
        nickname: memberInfo.nickname,
        gender: memberInfo.gender,
        type: memberInfo.type,
        status: memberInfo.status
      },
      formattedInfo,
      wecomResult
    });

  } catch (error) {
    console.error('测试查询失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberNumber, testUser = 'test_user', agentId = '1000011' } = body;

    if (!memberNumber) {
      return NextResponse.json({
        error: '请提供会员编号',
        usage: 'POST /api/wecom/test-query with body: { memberNumber: "M17071", testUser: "user123", agentId: "1000011" }'
      }, { status: 400 });
    }

    console.log(`🧪 开始POST测试会员查询: ${memberNumber}`);

    // 模拟完整的消息处理流程
    const extractedNumber = extractMemberNumber(memberNumber);
    const memberInfo = await getMemberByNumber(extractedNumber || memberNumber);
    
    if (!memberInfo) {
      return NextResponse.json({
        success: false,
        message: '未找到会员信息',
        testNumber: memberNumber,
        extractedNumber
      });
    }

    // 尝试发送到企业微信
    let wecomResult = null;
    try {
      const config = await getWecomConfig();
      if (config) {
        const accessToken = await getWecomAccessToken(config);
        if (accessToken) {
          const formattedInfo = formatMemberDetailsForReply(memberInfo);
          const message = {
            touser: testUser,
            msgtype: 'text' as const,
            agentid: agentId,
            text: {
              content: formattedInfo
            }
          };
          
          const success = await sendWecomMessage(accessToken, message);
          wecomResult = { 
            success, 
            config: { 
              corpId: config.corp_id, 
              agentId: config.agent_id 
            } 
          };
        }
      }
    } catch (error) {
      console.error('企业微信发送失败:', error);
      wecomResult = { success: false, error: error.message };
    }

    return NextResponse.json({
      success: true,
      testNumber: memberNumber,
      extractedNumber,
      memberFound: true,
      memberInfo: {
        id: memberInfo.id,
        member_no: memberInfo.member_no,
        nickname: memberInfo.nickname,
        gender: memberInfo.gender,
        type: memberInfo.type,
        status: memberInfo.status
      },
      wecomResult
    });

  } catch (error) {
    console.error('POST测试查询失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * 智能识别会员编号
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
 * 根据编号查询会员信息
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
    updated_at,
    phone,
    nickname
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

  const sexualOrientationMap: {[key: string]: string} = {
    'STRAIGHT_MALE': '直男',
    'STRAIGHT_FEMALE': '直女',
    'LES': 'LES',
    'GAY': 'GAY',
    'ASEXUAL': '无性恋'
  };
  const sexualOrientationText = sexual_orientation ? sexualOrientationMap[sexual_orientation] || sexual_orientation : '未填写';

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
• 性取向：${sexualOrientationText}

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