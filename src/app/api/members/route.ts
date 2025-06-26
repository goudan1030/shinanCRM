import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

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
      whereClause += ' AND (member_no LIKE ? OR nickname LIKE ? OR phone LIKE ? OR wechat LIKE ?)';
      const keyword = `%${searchKeyword}%`;
      queryParams.push(keyword, keyword, keyword, keyword);
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
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM members ${whereClause}`,
      queryParams
    );
    const total = (countResult as any[])[0].total;

    // 获取分页数据
    const [rows] = await pool.execute(
      `SELECT 
        id, 
        member_no, 
        nickname, 
        gender, 
        birth_year, 
        phone, 
        wechat,
        province,
        city, 
        district,
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