import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/mysql';

/**
 * 测试企业微信会员编号查询功能
 * POST /api/wecom/test-query
 */
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    if (!message) {
      return NextResponse.json({
        success: false,
        error: '请提供测试消息内容'
      }, { status: 400 });
    }

    console.log('测试查询消息:', message);

    // 提取会员编号
    const memberNumber = extractMemberNumber(message);
    
    const result: any = {
      inputMessage: message,
      extractedMemberNumber: memberNumber,
      timestamp: new Date().toISOString()
    };

    if (memberNumber) {
      console.log(`识别到会员编号: ${memberNumber}`);
      
      // 查询会员信息
      try {
        const memberInfo = await getMemberByNumber(memberNumber);
        
        if (memberInfo) {
          result.queryResult = {
            found: true,
            memberInfo: {
              id: memberInfo.id,
              member_no: memberInfo.member_no,
              gender: memberInfo.gender,
              birth_year: memberInfo.birth_year,
              status: memberInfo.status,
              type: memberInfo.type,
              created_at: memberInfo.created_at
            },
            formattedReply: formatMemberDetailsForReply(memberInfo)
          };
        } else {
          result.queryResult = {
            found: false,
            message: `未找到会员编号为 "${memberNumber}" 的会员信息`
          };
        }
      } catch (error) {
        result.queryResult = {
          error: error instanceof Error ? error.message : '查询出错'
        };
      }
    } else {
      result.queryResult = {
        message: '未识别到会员编号，将显示帮助信息',
        helpMessage: `💡 会员查询使用说明

🔍 发送会员编号即可查询详细信息

支持的编号格式：
• M17071（M+数字）
• 10921（纯数字）
• A1234（字母+数字）

📝 使用示例：
直接发送：M17071
直接发送：10921
直接发送：查询 M17071

💬 如有问题请联系管理员`
      };
    }

    return NextResponse.json({
      success: true,
      result: result
    });

  } catch (error) {
    console.error('测试查询API出错:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '测试失败'
    }, { status: 500 });
  }
}

/**
 * 提取会员编号
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