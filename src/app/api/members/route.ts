import { NextResponse } from 'next/server';
import pool from '../../../lib/mysql';
import { RowDataPacket } from 'mysql2';
import { membersCache, getFromCache } from '../../../lib/cache';

export async function GET(request: Request) {
  try {
    // 1. 获取请求参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');
    const type = searchParams.get('type');  // 添加会员类型参数
    const searchTerm = searchParams.get('search');
    const showDeleted = searchParams.get('showDeleted') === 'true'; // 添加一个参数来控制是否显示已删除的会员
    
    console.log('会员列表API接收参数:', { page, pageSize, status, type, searchTerm, showDeleted });
    
    // 2. 计算分页参数
    const offset = (page - 1) * pageSize;
    
    // 3. 使用缓存机制获取数据
    // 构建唯一的缓存键，包含所有查询参数
    const cacheKey = `members_list_${page}_${pageSize}_${status || 'all'}_${type || 'all'}_${searchTerm || 'none'}_${showDeleted ? 'with_deleted' : 'no_deleted'}`;
    
    const response = await getFromCache(
      membersCache,
      cacheKey,
      async () => {
        // 构建基础查询和条件，使用表中实际存在的字段
        let baseQuery = `
          SELECT 
            id, member_no, type, status, province, city, district, gender,
            target_area, birth_year, height, weight, education, occupation,
            wechat, phone, remaining_matches, created_at, updated_at,
            house_car, hukou_province, hukou_city, children_plan, marriage_cert,
            marriage_history, sexual_orientation
          FROM 
            members 
          WHERE 1=1`;
        
        const queryParams = [];
        
        // 默认只显示未删除的会员
        if (!showDeleted) {
          baseQuery += ` AND (deleted IS NULL OR deleted = FALSE)`;
        }
        
        // 添加状态筛选条件
        if (status) {
          baseQuery += ` AND status = ?`;
          queryParams.push(status);
        }
        
        // 添加会员类型筛选条件
        if (type) {
          baseQuery += ` AND type = ?`;
          queryParams.push(type);
        }
        
        // 添加搜索条件 - 使用表中实际存在的字段进行搜索
        if (searchTerm) {
          baseQuery += ` AND (member_no LIKE ? OR wechat LIKE ? OR phone LIKE ?)`;
          const searchPattern = `%${searchTerm}%`;
          queryParams.push(searchPattern, searchPattern, searchPattern);
        }
        
        // 添加排序和分页
        baseQuery += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        queryParams.push(pageSize, offset);
        
        console.log('执行SQL:', baseQuery, queryParams);
        
        // 执行查询
        const [rows] = await pool.execute<RowDataPacket[]>(baseQuery, queryParams);
        
        // 获取总数的查询
        let countQuery = `SELECT COUNT(*) as total FROM members WHERE 1=1`;
        const countParams = [];
        
        // 默认只计数未删除的会员
        if (!showDeleted) {
          countQuery += ` AND (deleted IS NULL OR deleted = FALSE)`;
        }
        
        // 添加计数查询的筛选条件 - 状态
        if (status) {
          countQuery += ` AND status = ?`;
          countParams.push(status);
        }
        
        // 添加计数查询的筛选条件 - 会员类型
        if (type) {
          countQuery += ` AND type = ?`;
          countParams.push(type);
        }
        
        // 添加计数查询的搜索条件
        if (searchTerm) {
          countQuery += ` AND (member_no LIKE ? OR wechat LIKE ? OR phone LIKE ?)`;
          const searchPattern = `%${searchTerm}%`;
          countParams.push(searchPattern, searchPattern, searchPattern);
        }
        
        // 执行计数查询
        const [countResult] = await pool.execute<RowDataPacket[]>(countQuery, countParams);
        const total = (countResult as RowDataPacket[])[0]?.total || 0;
        
        // 获取各类型会员数量
        const memberCountsQuery = `
          SELECT type, COUNT(*) as count 
          FROM members 
          WHERE deleted IS NULL OR deleted = FALSE
          GROUP BY type
        `;
        const [typeCounts] = await pool.execute<RowDataPacket[]>(memberCountsQuery);
        
        // 整理会员类型计数
        const memberCounts = {
          NORMAL: 0,
          ONE_TIME: 0,
          ANNUAL: 0,
          total
        };
        
        (typeCounts as RowDataPacket[]).forEach((row) => {
          const memberType = row.type as string;
          memberCounts[memberType] = row.count;
        });
        
        // 返回结果
        return {
          data: rows,
          total,
          page,
          pageSize,
          memberCounts
        };
      },
      60 * 1000 // 1分钟缓存期
    );
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('获取会员列表失败:', error);
    return NextResponse.json(
      { error: '获取会员列表失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}