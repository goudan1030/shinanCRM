import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { syncMemberToGoogleSheet } from '@/lib/google-sheets';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [rows] = await executeQuery(
      'SELECT * FROM members WHERE id = ?',
      [id]
    );

    if (!rows[0]) {
      return NextResponse.json(
        { error: '会员不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('获取会员信息失败:', error);
    return NextResponse.json(
      { error: '获取会员信息失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();

    // 构建更新字段
    const updateFields = [];
    const updateValues = [];

    // 遍历所有可更新字段
    const allowedFields = [
      'member_no', 'nickname', 'wechat', 'phone',
      'province', 'city', 'district', 'gender',
      'target_area', 'birth_year', 'height', 'weight',
      'education', 'occupation', 'house_car',
      'hukou_province', 'hukou_city', 'children_plan',
      'marriage_cert', 'marriage_history', 'sexual_orientation',
      'self_description', 'partner_requirement'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(data[field]);
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: '没有提供任何更新字段' },
        { status: 400 }
      );
    }

    // 添加更新时间
    updateFields.push('updated_at = NOW()');

    // 添加ID到更新值数组
    updateValues.push(id);

    // 执行更新
    await executeQuery(
      `UPDATE members SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // 获取更新后的会员信息
    const [rows] = await executeQuery(
      'SELECT * FROM members WHERE id = ?',
      [id]
    );

    if (!rows[0]) {
      return NextResponse.json(
        { error: '会员不存在' },
        { status: 404 }
      );
    }

    const member = rows[0] as any;

    // 同步到 Google 表格（失败不影响主流程）
    try {
      await syncMemberToGoogleSheet({
        id: member.id,
        member_no: member.member_no,
        nickname: member.nickname,
        gender: member.gender,
        birth_year: member.birth_year,
        height: member.height,
        weight: member.weight,
        phone: member.phone,
        wechat: member.wechat,
        wechat_qrcode: member.wechat_qrcode,
        province: member.province,
        city: member.city,
        district: member.district,
        target_area: member.target_area,
        house_car: member.house_car,
        hukou_province: member.hukou_province,
        hukou_city: member.hukou_city,
        children_plan: member.children_plan,
        marriage_cert: member.marriage_cert,
        marriage_history: member.marriage_history,
        sexual_orientation: member.sexual_orientation,
        self_description: member.self_description,
        partner_requirement: member.partner_requirement,
        type: member.type,
        status: member.status,
        education: member.education,
        occupation: member.occupation,
        remaining_matches: member.remaining_matches,
        created_at: member.created_at ? new Date(member.created_at).toISOString() : null,
        updated_at: member.updated_at ? new Date(member.updated_at).toISOString() : null,
      });
    } catch (syncError) {
      console.warn('同步会员到 Google 表格失败（忽略）', syncError);
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error('更新会员信息失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新会员信息失败' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { action, type, notes } = data;

    if (action === 'activate') {
      await executeQuery(
        'SELECT activate_member(?, ?)',
        [id, notes || null]
      );
    } else if (action === 'revoke') {
      await executeQuery(
        'SELECT revoke_member(?, ?)',
        [id, notes || null]
      );
    } else if (action === 'upgrade') {
      await executeQuery(
        'SELECT upgrade_member(?, ?, NOW(), NULL, ?)',
        [id, type, notes || null]
      );
    } else {
      return NextResponse.json(
        { error: '无效的操作类型' },
        { status: 400 }
      );
    }

    // 获取更新后的会员信息
    const [rows] = await executeQuery(
      'SELECT * FROM members WHERE id = ?',
      [id]
    );

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('更新会员信息失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新会员信息失败' },
      { status: 500 }
    );
  }
}