import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/finance/alipay/list');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '25');
    const searchKeyword = searchParams.get('searchKeyword') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const memberNo = searchParams.get('memberNo') || '';

    const offset = (page - 1) * pageSize;

    // 构建查询条件
    let query = `
      SELECT 
        at.*,
        m.nickname as member_name,
        m.phone as member_phone
      FROM alipay_transactions at
      LEFT JOIN members m ON at.member_no = m.member_no
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM alipay_transactions at WHERE 1=1';
    const params: (string | number)[] = [];
    const countParams: (string | number)[] = [];

    // 搜索关键词
    if (searchKeyword) {
      const searchCondition = ` AND (at.trade_no LIKE ? OR at.out_trade_no LIKE ? OR at.payer_name LIKE ? OR at.payer_account LIKE ? OR at.product_name LIKE ?)`;
      query += searchCondition;
      countQuery += searchCondition;
      const searchPattern = `%${searchKeyword}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // 日期范围
    if (startDate) {
      query += ' AND DATE(at.trade_time) >= ?';
      countQuery += ' AND DATE(at.trade_time) >= ?';
      params.push(startDate);
      countParams.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(at.trade_time) <= ?';
      countQuery += ' AND DATE(at.trade_time) <= ?';
      params.push(endDate);
      countParams.push(endDate);
    }

    // 会员筛选
    if (memberNo) {
      query += ' AND at.member_no = ?';
      countQuery += ' AND at.member_no = ?';
      params.push(memberNo);
      countParams.push(memberNo);
    }

    // 排序
    query += ' ORDER BY at.trade_time DESC, at.id DESC';
    query += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    // 执行查询
    const [recordsResult] = await executeQuery(query, params);
    const [countResult] = await executeQuery(countQuery, countParams);

    // 解析查询结果
    let records: any[] = [];
    if (Array.isArray(recordsResult)) {
      if (recordsResult.length === 2 && Array.isArray(recordsResult[0])) {
        records = recordsResult[0];
      } else if (Array.isArray(recordsResult[0])) {
        records = recordsResult[0];
      } else {
        records = recordsResult;
      }
    }

    let total = 0;
    if (Array.isArray(countResult)) {
      const countRows = Array.isArray(countResult[0]) ? countResult[0] : countResult;
      if (countRows.length > 0 && countRows[0] && typeof countRows[0] === 'object' && 'total' in countRows[0]) {
        total = Number((countRows[0] as any).total);
      }
    }

    const totalPages = Math.ceil(total / pageSize);

    logger.debug('查询支付宝收款记录', { page, pageSize, total });

    return createSuccessResponse({
      records,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    }, '查询成功');

  } catch (error) {
    logger.error('查询支付宝收款记录失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse('查询失败', 500);
  }
}

