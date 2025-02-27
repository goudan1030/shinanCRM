import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const gender = searchParams.get('gender');
    const searchTerm = searchParams.get('search');

    // 获取各类型会员数量
    const [memberCounts] = await pool.execute(
      'SELECT type, COUNT(*) as count FROM members WHERE deleted = FALSE GROUP BY type'
    );

    const counts = {
      NORMAL: 0,
      ONE_TIME: 0,
      ANNUAL: 0
    };

    memberCounts.forEach((row: any) => {
      counts[row.type] = row.count;
    });

    console.log('会员类型统计:', {
      普通会员: counts.NORMAL,
      一次性会员: counts.ONE_TIME,
      年费会员: counts.ANNUAL
    });

    let query = 'SELECT m.* FROM members m';
    let conditions = ['m.deleted = FALSE'];
    const params: any[] = [];

    if (status) {
      conditions.push('m.status = ?');
      params.push(status);
    }

    if (type && type !== 'all') {
      switch (type) {
        case 'NORMAL':
          conditions.push('m.type = "NORMAL"');
          break;
        case 'ONE_TIME':
          conditions.push('m.type = "ONE_TIME"');
          break;
        case 'ANNUAL':
          conditions.push('m.type = "ANNUAL"');
          break;
      }
    }

    if (gender) {
      conditions.push('m.gender = ?');
      params.push(gender);
    }

    if (searchTerm) {
      conditions.push('(m.member_no LIKE ? OR m.wechat LIKE ? OR m.phone LIKE ?)');
      const searchPattern = `%${searchTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM (${query}) as subquery`,
      params
    );
    const total = countResult[0].total;

    const offset = (page - 1) * pageSize;
    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const [rows] = await pool.execute(query, params);

    return NextResponse.json({
      data: rows,
      total,
      page,
      pageSize,
      memberCounts: counts
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: '获取会员列表失败' },
      { status: 500 }
    );
  }
}