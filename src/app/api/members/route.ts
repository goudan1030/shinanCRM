import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '25'));
    const searchKeyword = searchParams.get('searchKeyword') || '';
    const memberType = searchParams.get('memberType') || '';
    const status = searchParams.get('status') || '';
    const city = searchParams.get('city') || '';

    const offset = (page - 1) * pageSize;

    // 构建查询条件
    let whereClause = 'WHERE deleted = 0';
    const queryParams: any[] = [];

    if (searchKeyword) {
      // 判断是否为会员编号格式（M开头+数字）
      const isMemberNo = /^M\d+$/i.test(searchKeyword.trim());
      
      if (isMemberNo) {
        // 会员编号使用精确匹配
        whereClause += ' AND (member_no = ? OR nickname LIKE ? OR phone LIKE ? OR wechat LIKE ?)';
        const fuzzyKeyword = `%${searchKeyword}%`;
        queryParams.push(searchKeyword.trim(), fuzzyKeyword, fuzzyKeyword, fuzzyKeyword);
      } else {
        // 其他搜索使用模糊匹配
        whereClause += ' AND (member_no LIKE ? OR nickname LIKE ? OR phone LIKE ? OR wechat LIKE ?)';
        const keyword = `%${searchKeyword}%`;
        queryParams.push(keyword, keyword, keyword, keyword);
      }
    }

    if (memberType) {
      whereClause += ' AND type = ?';
      queryParams.push(memberType);
    }

    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }

    if (city) {
      whereClause += ' AND city = ?';
      queryParams.push(city);
    }

    // 获取总数
    const [countResult] = await executeQuery(
      `SELECT COUNT(*) as total FROM members ${whereClause}`,
      queryParams
    );
    const total = (countResult as any[])[0].total;

    // 获取分页数据
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
        wechat_qrcode,
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
    console.error('获取会员列表失败:', error);
    
    const response = NextResponse.json({
      success: false,
      error: '获取会员列表失败'
    }, { status: 500 });

    // 禁用缓存
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  }
}