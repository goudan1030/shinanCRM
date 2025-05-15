import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/mysql';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '25');
    
    console.log('年费会员查询参数:', { page, pageSize });

    // 使用真实数据库查询
    const mysql = await createClient();
    
    // 计算分页参数
    const offset = (page - 1) * pageSize;

    // 完全简化，不使用任何条件，只做基本查询
    const query = `SELECT * FROM members LIMIT ${pageSize} OFFSET ${offset}`;
    console.log('执行查询:', query);
    
    const [rows] = await mysql.query<RowDataPacket[]>(query);
    
    // 获取总数
    const countQuery = 'SELECT COUNT(*) as total FROM members';
    console.log('执行总数查询:', countQuery);
    
    const [countResult] = await mysql.query<RowDataPacket[]>(countQuery);
    
    await mysql.end();
    
    const total = (countResult as RowDataPacket[])[0]?.total || 0;
    
    // 输出查询结果信息
    console.log('年费会员API返回数据条数:', (rows as RowDataPacket[]).length);
    
    return new NextResponse(JSON.stringify({
      data: rows,
      total,
      page,
      pageSize
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('获取年费会员列表失败:', error);
    return new NextResponse(JSON.stringify({ 
      error: '获取年费会员列表失败', 
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}