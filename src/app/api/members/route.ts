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
    const isSuccess = searchParams.get('isSuccess') || '';

    const offset = (page - 1) * pageSize;

    // 构建查询条件
    let whereClause = 'WHERE deleted = 0';
    const queryParams: (string | number)[] = [];

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

    if (isSuccess !== '') {
      whereClause += ' AND is_success = ?';
      queryParams.push(parseInt(isSuccess));
    }

    // 获取总数
    const [countResult] = await executeQuery(
      `SELECT COUNT(*) as total FROM members ${whereClause}`,
      queryParams
    );
    interface CountResult {
      total: number;
    }
    const total = Array.isArray(countResult) && countResult[0] && typeof countResult[0] === 'object' && 'total' in countResult[0]
      ? Number((countResult[0] as CountResult).total) || 0
      : 0;

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
        is_success,
        created_at, 
        updated_at
       FROM members 
       ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...queryParams, pageSize, offset]
    );

    const { createSuccessResponse } = await import('@/lib/api-utils');
    return createSuccessResponse({
      data: rows,
      total: total,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }, '获取会员列表成功');
  } catch (error) {
    const logger = (await import('@/lib/logger')).createLogger('api/members');
    logger.error('获取会员列表失败', error instanceof Error ? error : new Error(String(error)));
    
    const { createErrorResponse } = await import('@/lib/api-utils');
    return createErrorResponse('获取会员列表失败', 500);
  }
}