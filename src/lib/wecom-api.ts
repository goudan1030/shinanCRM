/**
 * 企业微信API工具库
 * 
 * 提供企业微信应用消息发送功能
 * 支持获取access_token、发送应用消息等
 */

import pool from './mysql';

/**
 * 企业微信配置接口
 */
interface WecomConfig {
  corp_id: string;
  agent_id: string;
  secret: string;
  member_notification_enabled?: boolean;
  notification_recipients?: string;
  message_type?: 'text' | 'textcard' | 'markdown';
  custom_message_template?: string;
}

/**
 * 企业微信Access Token响应
 */
interface WecomTokenResponse {
  errcode: number;
  errmsg: string;
  access_token?: string;
  expires_in?: number;
}

/**
 * 企业微信消息发送响应
 */
interface WecomMessageResponse {
  errcode: number;
  errmsg: string;
  invaliduser?: string;
  invalidparty?: string;
  invalidtag?: string;
}

/**
 * 企业微信消息内容
 */
interface WecomMessage {
  touser?: string;      // 接收者用户ID列表，多个用|分隔，最多1000个，@all表示全体
  toparty?: string;     // 接收者部门ID列表
  totag?: string;       // 接收者标签ID列表
  msgtype: 'text' | 'textcard' | 'markdown';  // 消息类型
  agentid: string;      // 应用ID
  text?: {
    content: string;
  };
  textcard?: {
    title: string;
    description: string;
    url: string;
    btntxt?: string;
  };
  markdown?: {
    content: string;
  };
  safe?: number;        // 是否是保密消息
}

/**
 * 获取企业微信配置
 */
export async function getWecomConfig(): Promise<WecomConfig | null> {
  try {
    const [rows] = await pool.execute('SELECT * FROM wecom_config LIMIT 1');
    const configs = rows as WecomConfig[];
    
    if (configs.length === 0) {
      console.log('未找到企业微信配置');
      return null;
    }
    
    const config = configs[0];
    
    // 验证配置完整性
    if (!config.corp_id || !config.agent_id || !config.secret) {
      console.log('企业微信配置不完整');
      return null;
    }
    
    // 检查是否启用了会员登记通知
    if (config.member_notification_enabled === false) {
      console.log('会员登记通知已禁用');
      return null;
    }
    
    return config;
  } catch (error) {
    console.error('获取企业微信配置失败:', error);
    return null;
  }
}

/**
 * 获取企业微信Access Token
 */
export async function getWecomAccessToken(config: WecomConfig): Promise<string | null> {
  try {
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${config.corp_id}&corpsecret=${config.secret}`;
    
    const response = await fetch(url, {
      method: 'GET'
    });
    
    if (!response.ok) {
      console.error('企业微信API请求失败:', response.status, response.statusText);
      return null;
    }
    
    const data: WecomTokenResponse = await response.json();
    
    if (data.errcode !== 0) {
      console.error('获取企业微信Access Token失败:', data.errcode, data.errmsg);
      return null;
    }
    
    if (!data.access_token) {
      console.error('企业微信返回的Access Token为空');
      return null;
    }
    
    console.log('✓ 企业微信Access Token获取成功');
    return data.access_token;
  } catch (error) {
    console.error('获取企业微信Access Token出错:', error);
    return null;
  }
}

/**
 * 发送企业微信消息结果
 */
interface WecomSendResult {
  success: boolean;
  error?: string;
  errorCode?: number;
  data?: WecomMessageResponse;
}

/**
 * 发送企业微信消息
 */
export async function sendWecomMessage(accessToken: string, message: WecomMessage): Promise<boolean> {
  const result = await sendWecomMessageDetailed(accessToken, message);
  return result.success;
}

/**
 * 发送企业微信消息（详细结果）
 */
export async function sendWecomMessageDetailed(accessToken: string, message: WecomMessage): Promise<WecomSendResult> {
  try {
    const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`;
    
    console.log('发送企业微信消息:', JSON.stringify(message, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      const error = `HTTP请求失败: ${response.status} ${response.statusText}`;
      console.error('企业微信消息发送请求失败:', error);
      return {
        success: false,
        error: error
      };
    }
    
    const data: WecomMessageResponse = await response.json();
    console.log('企业微信API响应:', JSON.stringify(data, null, 2));
    
    if (data.errcode !== 0) {
      const error = `企业微信API错误: ${data.errcode} - ${data.errmsg}`;
      console.error('企业微信消息发送失败:', error);
      return {
        success: false,
        error: error,
        errorCode: data.errcode,
        data: data
      };
    }
    
    console.log('✓ 企业微信消息发送成功');
    return {
      success: true,
      data: data
    };
  } catch (error) {
    const errorMsg = `网络或其他错误: ${error instanceof Error ? error.message : '未知错误'}`;
    console.error('企业微信消息发送出错:', errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * 格式化会员信息为文本消息
 */
export function formatMemberNotificationText(memberData: any): string {
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
    created_at
  } = memberData;

  // 格式化性别
  const genderText = gender === 'male' ? '男' : gender === 'female' ? '女' : '未知';
  
  // 格式化学历
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
  
  // 格式化房车情况
  const houseCarMap: {[key: string]: string} = {
    'NEITHER': '无房无车',
    'HOUSE_ONLY': '有房无车',
    'CAR_ONLY': '有车无房',
    'BOTH': '有房有车'
  };
  const houseCarText = house_car ? houseCarMap[house_car] || house_car : '未填写';
  
  // 格式化孩子需求
  const childrenPlanMap: {[key: string]: string} = {
    'NONE': '不要孩子',
    'SEPARATE': '各自要',
    'BOTH': '一起要',
    'NEGOTIATE': '协商'
  };
  const childrenPlanText = children_plan ? childrenPlanMap[children_plan] || children_plan : '未填写';
  
  // 格式化领证需求
  const marriageCertMap: {[key: string]: string} = {
    'DONT_WANT': '不想领证',
    'WANT': '想领证',
    'NEGOTIATE': '互相协商'
  };
  const marriageCertText = marriage_cert ? marriageCertMap[marriage_cert] || marriage_cert : '未填写';
  
  // 格式化时间
  const timeStr = new Date(created_at).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Shanghai'
  });

  return `🎉 新会员登记通知

📋 会员信息：
• 会员编号：${member_no || '未分配'}
• 性别：${genderText}
• 出生年份：${birth_year ? birth_year + '年' : '未填写'}
• 身高：${height ? height + 'cm' : '未填写'}
• 体重：${weight ? weight + 'kg' : '未填写'}
• 学历：${educationText}
• 职业：${occupation || '未填写'}
• 所在地：${[province, city, district].filter(Boolean).join(' ') || '未填写'}
• 户口所在地：${[hukou_province, hukou_city].filter(Boolean).join(' ') || '未填写'}
• 目标区域：${target_area || '未填写'}
• 房车情况：${houseCarText}
• 婚史：${marriage_history || '未填写'}
• 性取向：${sexual_orientation || '未填写'}
• 孩子需求：${childrenPlanText}
• 领证需求：${marriageCertText}

💭 个人说明：
${self_description || '未填写'}

💕 择偶要求：
${partner_requirement || '未填写'}

⏰ 登记时间：${timeStr}

请及时跟进新会员的后续服务工作。`;
}

/**
 * 格式化会员信息为卡片消息
 */
export function formatMemberNotificationCard(memberData: any): { title: string; description: string; url: string; btntxt?: string } {
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
    house_car,
    sexual_orientation,
    created_at
  } = memberData;

  const genderText = gender === 'male' ? '男' : gender === 'female' ? '女' : '未知';
  
  // 格式化学历
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
  
  // 格式化房车情况
  const houseCarMap: {[key: string]: string} = {
    'NEITHER': '无房无车',
    'HOUSE_ONLY': '有房无车',
    'CAR_ONLY': '有车无房',
    'BOTH': '有房有车'
  };
  const houseCarText = house_car ? houseCarMap[house_car] || house_car : '未填写';
  
  const timeStr = new Date(created_at).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Shanghai'
  });

  return {
    title: "🎉 新会员登记通知",
    description: `会员编号：${member_no || '未分配'}
性别：${genderText} | 出生年份：${birth_year ? birth_year + '年' : '未知'}
身高：${height ? height + 'cm' : '未知'} | 体重：${weight ? weight + 'kg' : '未知'}
学历：${educationText} | 职业：${occupation || '未填写'}
所在地：${[province, city, district].filter(Boolean).join(' ') || '未填写'}
房车情况：${houseCarText} | 性取向：${sexual_orientation || '未填写'}
登记时间：${timeStr}`,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://admin.xinghun.info'}/members/${memberData.id || member_no}`,
    btntxt: "查看详情"
  };
}

/**
 * 格式化会员信息为Markdown消息
 */
export function formatMemberNotificationMarkdown(memberData: any): string {
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
    created_at
  } = memberData;

  const genderText = gender === 'male' ? '男' : gender === 'female' ? '女' : '未知';
  
  // 格式化学历
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
  
  // 格式化房车情况
  const houseCarMap: {[key: string]: string} = {
    'NEITHER': '无房无车',
    'HOUSE_ONLY': '有房无车',
    'CAR_ONLY': '有车无房',
    'BOTH': '有房有车'
  };
  const houseCarText = house_car ? houseCarMap[house_car] || house_car : '未填写';
  
  // 格式化孩子需求
  const childrenPlanMap: {[key: string]: string} = {
    'NONE': '不要孩子',
    'SEPARATE': '各自要',
    'BOTH': '一起要',
    'NEGOTIATE': '协商'
  };
  const childrenPlanText = children_plan ? childrenPlanMap[children_plan] || children_plan : '未填写';
  
  // 格式化领证需求
  const marriageCertMap: {[key: string]: string} = {
    'DONT_WANT': '不想领证',
    'WANT': '想领证',
    'NEGOTIATE': '互相协商'
  };
  const marriageCertText = marriage_cert ? marriageCertMap[marriage_cert] || marriage_cert : '未填写';
  
  const timeStr = new Date(created_at).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Shanghai'
  });

  return `# 🎉 新会员登记通知

## 📋 基本信息
- **会员编号**：${member_no || '未分配'}
- **性别**：${genderText}
- **出生年份**：${birth_year ? birth_year + '年' : '未填写'}
- **身高**：${height ? height + 'cm' : '未填写'}
- **体重**：${weight ? weight + 'kg' : '未填写'}

## 🎓 教育职业
- **学历**：${educationText}
- **职业**：${occupation || '未填写'}

## 📍 地区信息
- **所在地**：${[province, city, district].filter(Boolean).join(' ') || '未填写'}
- **户口所在地**：${[hukou_province, hukou_city].filter(Boolean).join(' ') || '未填写'}
- **目标区域**：${target_area || '未填写'}

## 💼 基本条件
- **房车情况**：${houseCarText}
- **婚史**：${marriage_history || '未填写'}
- **性取向**：${sexual_orientation || '未填写'}

## 👨‍👩‍👧‍👦 婚恋意向
- **孩子需求**：${childrenPlanText}
- **领证需求**：${marriageCertText}

## 💭 个人说明
${self_description || '未填写'}

## 💕 择偶要求
${partner_requirement || '未填写'}

## ⏰ 登记时间
${timeStr}

**请及时跟进新会员的后续服务工作。**`;
}

/**
 * 发送会员登记通知
 */
export async function sendMemberRegistrationNotification(memberData: any): Promise<boolean> {
  try {
    console.log('开始发送会员登记通知...');
    
    // 获取企业微信配置
    const config = await getWecomConfig();
    if (!config) {
      console.log('企业微信配置不存在，跳过通知发送');
      return false;
    }
    
    // 获取Access Token
    const accessToken = await getWecomAccessToken(config);
    if (!accessToken) {
      console.log('无法获取企业微信Access Token，跳过通知发送');
      return false;
    }
    
    // 准备消息内容，根据配置选择消息类型和接收者
    const messageType = config.message_type || 'textcard';
    const recipients = config.notification_recipients || '@all';
    
    const message: WecomMessage = {
      touser: recipients,
      msgtype: messageType,
      agentid: config.agent_id
    };
    
    // 根据消息类型设置消息内容
    switch (messageType) {
      case 'textcard':
        message.textcard = formatMemberNotificationCard(memberData);
        break;
      case 'text':
        message.text = {
          content: formatMemberNotificationText(memberData)
        };
        break;
      case 'markdown':
        message.markdown = {
          content: formatMemberNotificationMarkdown(memberData)
        };
        break;
      default:
        message.textcard = formatMemberNotificationCard(memberData);
    }
    
    // 发送消息
    const success = await sendWecomMessage(accessToken, message);
    
    if (success) {
      console.log('✓ 会员登记通知发送成功');
    } else {
      console.log('✗ 会员登记通知发送失败');
    }
    
    return success;
  } catch (error) {
    console.error('发送会员登记通知出错:', error);
    return false;
  }
} 