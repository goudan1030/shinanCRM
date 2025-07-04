import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { members: any[] };
    const { members } = body;

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({
        success: false,
        error: '请提供有效的会员数据'
      }, { status: 400 });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // 批量导入会员
    for (const member of members) {
      try {
        // 验证必需字段
        if (!member.name || !member.phone) {
          errors.push(`会员 ${member.name || '未知'} 缺少必需信息`);
          errorCount++;
          continue;
        }

        // 检查手机号是否已存在
        const [existing] = await pool.execute(
          'SELECT id FROM members WHERE phone = ? AND deleted = 0',
          [member.phone]
        );

        if (Array.isArray(existing) && existing.length > 0) {
          errors.push(`手机号 ${member.phone} 已存在`);
          errorCount++;
          continue;
        }

        // 生成会员编号
        const memberNo = `M${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // 插入会员数据
        await pool.execute(
          `INSERT INTO members (
            member_no, name, gender, age, phone, city, 
            member_type, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            memberNo,
            member.name,
            member.gender || 'unknown',
            member.age || null,
            member.phone,
            member.city || '',
            member.member_type || 'normal',
            member.status || 'active'
          ]
        );

        successCount++;
      } catch (error) {
        console.error(`导入会员失败:`, error);
        errors.push(`会员 ${member.name} 导入失败`);
        errorCount++;
      }
    }

    const response = NextResponse.json({
      success: true,
      data: {
        successCount,
        errorCount,
        errors: errors.slice(0, 10) // 只返回前10个错误
      },
      message: `导入完成：成功 ${successCount} 个，失败 ${errorCount} 个`
    });

    // 禁用缓存
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('批量导入会员失败:', error);
    
    const response = NextResponse.json({
      success: false,
      error: '批量导入失败'
    }, { status: 500 });

    // 禁用缓存
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  }
} 