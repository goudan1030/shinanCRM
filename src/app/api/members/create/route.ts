import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    // 获取当前用户会话信息
    const session = await getServerSession(authOptions);
    
    const data = await request.json() as MemberData;
    
    // 验证必填字段
    const requiredFields = ['member_no', 'wechat', 'phone'];
    for (const field of requiredFields) {
      if (!data[field as keyof MemberData]) {
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

    // 插入会员数据
    const [result] = await pool.execute(
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

    return NextResponse.json({
      success: true,
      message: '创建成功',
      id: memberId
    });

  } catch (error) {
    console.error('创建会员失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建失败' },
      { status: 500 }
    );
  }
}