import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

// 获取推荐会员列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '25');
    const search = searchParams.get('search') || '';
    
    // 计算偏移量
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let whereClause = 'WHERE is_recommended = 1 AND deleted = 0';
    const queryParams: any[] = [];
    
    if (search) {
      whereClause += ' AND (member_no LIKE ? OR nickname LIKE ? OR phone LIKE ? OR wechat LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // 查询总记录数
    const [countResult] = await executeQuery(
      `SELECT COUNT(*) as total FROM members ${whereClause}`,
      queryParams
    );
    const total = (countResult as any[])[0].total;
    
    // 查询推荐会员列表
    const [rows] = await executeQuery(
      `SELECT 
        id, 
        member_no, 
        nickname, 
        gender, 
        birth_year, 
        height,
        weight,
        phone, 
        wechat,
        province,
        city, 
        district,
        target_area,
        house_car,
        hukou_province,
        hukou_city,
        children_plan,
        marriage_cert,
        marriage_history,
        sexual_orientation,
        self_description,
        partner_requirement,
        type, 
        status, 
        education,
        occupation,
        remaining_matches,
        is_recommended,
        created_at, 
        updated_at
       FROM members 
       ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...queryParams, pageSize, offset]
    );

    const response = NextResponse.json({
      success: true,
      data: rows,
      total: total,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });

    // 禁用缓存
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('获取推荐会员列表失败:', error);
    
    const response = NextResponse.json({
      success: false,
      error: '获取推荐会员列表失败'
    }, { status: 500 });

    // 禁用缓存
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  }
}

// 添加推荐会员
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { memberId } = data;

    if (!memberId) {
      return NextResponse.json({
        success: false,
        error: '会员ID不能为空'
      }, { status: 400 });
    }

    // 检查会员是否存在
    const [existingMembers] = await executeQuery(
      'SELECT * FROM members WHERE id = ? AND deleted = 0',
      [memberId]
    );

    if ((existingMembers as any[]).length === 0) {
      return NextResponse.json({
        success: false,
        error: '会员不存在'
      }, { status: 404 });
    }

    // 检查是否已经是推荐会员
    const member = (existingMembers as any[])[0];
    if (member.is_recommended === 1) {
      return NextResponse.json({
        success: false,
        error: '该会员已经是推荐会员'
      }, { status: 400 });
    }

    // 更新为推荐会员
    await executeQuery(
      'UPDATE members SET is_recommended = 1, updated_at = NOW() WHERE id = ?',
      [memberId]
    );

    return NextResponse.json({
      success: true,
      message: '添加推荐会员成功',
      data: {
        memberId,
        memberNo: member.member_no,
        nickname: member.nickname
      }
    });
  } catch (error) {
    console.error('添加推荐会员失败:', error);
    return NextResponse.json({
      success: false,
      error: '添加推荐会员失败'
    }, { status: 500 });
  }
}
