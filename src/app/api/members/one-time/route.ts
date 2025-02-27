import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/mysql';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: '未授权访问' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '25');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    console.log('一次性会员查询参数:', {
      page,
      pageSize,
      status,
      search
    });

    const offset = (page - 1) * pageSize;

    const mysql = createClient();

    let query = 'SELECT SQL_CALC_FOUND_ROWS * FROM members WHERE type = "ONE_TIME"';
    const queryParams: any[] = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      queryParams.push(status);
    }

    if (search) {
      query += ' AND (member_no LIKE ? OR wechat LIKE ? OR phone LIKE ?)';
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(pageSize, offset);

    const [members] = await mysql.query(query, queryParams);
    const [countResult] = await mysql.query('SELECT FOUND_ROWS() as total');
    const total = countResult[0].total;

    await mysql.end();

    return new NextResponse(JSON.stringify({
      data: members,
      total,
      page,
      pageSize
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('获取一次性会员列表失败:', error);
    return new NextResponse(JSON.stringify({ error: '获取一次性会员列表失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}