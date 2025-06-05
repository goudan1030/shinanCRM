import { NextResponse } from 'next/server';
// 在Netlify环境使用优化的数据库连接
import { executeQuery, testNetlifyConnection } from '@/lib/database-netlify';
import { getSession } from '@/lib/auth';

// 定义会员数据类型
interface MemberData {
  member_no: string;
  nickname?: string;
  wechat: string;
  phone: string;
  type?: string;
  gender?: string;
  birth_year?: number;
  height?: number;
  weight?: number;
  education?: string;
  occupation?: string;
  province?: string;
  city?: string;
  district?: string;
  target_area?: string;
  house_car?: string;
  hukou_province?: string;
  hukou_city?: string;
  children_plan?: string;
  marriage_cert?: string;
  marriage_history?: string;
  sexual_orientation?: string;
  self_description?: string;
  partner_requirement?: string;
}

export async function POST(request: Request) {
  try {
    console.log('=== 开始创建会员 ===');
    
    // 首先测试数据库连接
    const dbConnected = await testNetlifyConnection();
    if (!dbConnected) {
      throw new Error('数据库连接失败');
    }
    
    // 使用自定义认证替代next-auth
    const session = await getSession().catch(err => {
      console.log('认证检查失败（忽略）:', err.message);
      return null;
    });
    console.log('用户会话验证:', session ? '已登录' : '未登录');
    
    const data = await request.json() as MemberData;
    console.log('接收到的数据:', { 
      member_no: data.member_no, 
      wechat: data.wechat, 
      phone: data.phone,
      gender: data.gender
    });
    
    // 验证必填字段
    const requiredFields = ['member_no', 'wechat', 'phone'];
    for (const field of requiredFields) {
      if (!data[field as keyof MemberData]) {
        console.log(`验证失败: ${field} 为空`);
        return NextResponse.json(
          { error: `${field} 不能为空` },
          { status: 400 }
        );
      }
    }

    // 转换数字类型字段
    const numberFields = ['birth_year', 'height', 'weight'];
    numberFields.forEach(field => {
      if (data[field as keyof MemberData]) {
        data[field as 'birth_year' | 'height' | 'weight'] = parseInt(data[field as 'birth_year' | 'height' | 'weight'] as unknown as string);
      }
    });

    console.log('开始数据库插入操作...');
    
    // 使用优化的数据库查询函数
    const [result] = await executeQuery(
      `INSERT INTO members (
        member_no, nickname, wechat, phone, type,
        gender, birth_year, height, weight,
        education, occupation, province, city, district,
        target_area, house_car, hukou_province, hukou_city,
        children_plan, marriage_cert, marriage_history,
        sexual_orientation, self_description, partner_requirement,
        status, remaining_matches, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.member_no,
        data.nickname || null,
        data.wechat,
        data.phone,
        data.type || 'NORMAL',
        data.gender || null,
        data.birth_year || null,
        data.height || null,
        data.weight || null,
        data.education || null,
        data.occupation || null,
        data.province || null,
        data.city || null,
        data.district || null,
        data.target_area || null,
        data.house_car || null,
        data.hukou_province || null,
        data.hukou_city || null,
        data.children_plan || null,
        data.marriage_cert || null,
        data.marriage_history || null,
        data.sexual_orientation || null,
        data.self_description || null,
        data.partner_requirement || null,
        'ACTIVE',  // 设置默认状态为激活
        data.gender === 'female' ? 1 : 0,  // 女性默认1次匹配机会，男性0次
      ]
    );
    
    // 获取新创建的会员ID
    const memberId = (result as any).insertId;
    console.log('✓ 会员创建成功:', { memberId });

    return NextResponse.json({
      success: true,
      message: '创建成功',
      id: memberId
    });

  } catch (error) {
    console.error('创建会员失败:', error);
    
    // 详细的错误日志
    if (error instanceof Error) {
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // 特殊处理数据库连接错误
      if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { 
            error: 'Database connection failed. Please check server configuration.',
            details: '数据库连接失败，请检查服务器配置'
          },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'There is a problem with the server configuration. Check the server logs for more information.',
        details: error instanceof Error ? error.message : '创建失败'
      },
      { status: 500 }
    );
  }
}