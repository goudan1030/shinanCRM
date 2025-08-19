import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

export async function GET(request: NextRequest) {
  try {
    // 获取今日的日期范围
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const startDate = startOfDay.toISOString().slice(0, 19).replace('T', ' ');
    const endDate = endOfDay.toISOString().slice(0, 19).replace('T', ' ');

    // 查询今日刷新的会员总数
    const [countResult] = await executeQuery(
      `SELECT COUNT(*) as total FROM members 
       WHERE deleted = 0 
       AND refresh_time IS NOT NULL 
       AND refresh_time >= ? 
       AND refresh_time <= ?`,
      [startDate, endDate]
    );

    const total = countResult.total;

    // 查询今日刷新的会员列表
    const [rows] = await executeQuery(
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
        refresh_time, 
        created_at
       FROM members 
       WHERE deleted = 0 
       AND refresh_time IS NOT NULL 
       AND refresh_time >= ? 
       AND refresh_time <= ?
       ORDER BY refresh_time DESC`,
      [startDate, endDate]
    );

    return NextResponse.json({
      success: true,
      data: rows,
      total: total,
      dateRange: {
        start: startDate,
        end: endDate
      }
    });

  } catch (error) {
    console.error('获取刷新列表失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取刷新会员列表失败'
    }, { status: 500 });
  }
}
