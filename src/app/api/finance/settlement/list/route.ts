import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '25');
    const searchKeyword = searchParams.get('searchKeyword') || '';
    const month = searchParams.get('month') || '';
    const year = searchParams.get('year') || '';

    const offset = (page - 1) * pageSize;

    // 构建基础查询
    let query = 'SELECT SQL_CALC_FOUND_ROWS * FROM settlement_records WHERE 1=1';
    const params: any[] = [];

    // 添加搜索条件
    if (searchKeyword) {
      query += ' AND (member_no LIKE ? OR notes LIKE ?)';
      params.push(`%${searchKeyword}%`, `%${searchKeyword}%`);
    }

    // 添加年月筛选
    if (year && year !== 'all') {
      if (month && month !== 'all') {
        // 按年月筛选
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        query += ' AND settlement_date BETWEEN ? AND ?';
        params.push(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
      } else {
        // 仅按年份筛选
        const startDate = new Date(parseInt(year), 0, 1);
        const endDate = new Date(parseInt(year), 11, 31);
        query += ' AND settlement_date BETWEEN ? AND ?';
        params.push(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
      }
    } else if (month && month !== 'all') {
      // 仅按月份筛选（所有年份的该月份）
      query += ' AND MONTH(settlement_date) = ?';
      params.push(parseInt(month));
    }

    // 添加排序和分页
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    // 执行主查询
    const [records] = await executeQuery(query, params);

    // 获取总记录数
    const [countResult] = await executeQuery('SELECT FOUND_ROWS() as total');
    const total = countResult[0].total;

    return NextResponse.json({
      records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('获取结算记录失败:', error);
    return NextResponse.json(
      { error: '获取结算记录失败' },
      { status: 500 }
    );
  }
}