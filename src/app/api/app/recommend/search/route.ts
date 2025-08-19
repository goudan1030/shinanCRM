import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

// 搜索非推荐会员
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    
    if (!search || search.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0
      });
    }
    
    // 搜索非推荐会员
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
        created_at
       FROM members 
       WHERE is_recommended = 0 
         AND deleted = 0 
         AND (member_no LIKE ? OR nickname LIKE ? OR phone LIKE ? OR wechat LIKE ?)
       ORDER BY created_at DESC 
       LIMIT ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, limit]
    );

    const response = NextResponse.json({
      success: true,
      data: rows,
      total: (rows as any[]).length
    });

    // 禁用缓存
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('搜索会员失败:', error);
    
    const response = NextResponse.json({
      success: false,
      error: '搜索会员失败'
    }, { status: 500 });

    // 禁用缓存
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  }
}
