import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/members/import');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { members: any[] };
    const { members } = body;

    if (!Array.isArray(members) || members.length === 0) {
      return createErrorResponse('请提供有效的会员数据', 400);
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // 批量导入会员
    for (const member of members) {
      try {
        // 验证必需字段
        if (!member.nickname || !member.phone) {
          errors.push(`会员 ${member.nickname || '未知'} 缺少必需信息`);
          errorCount++;
          continue;
        }

        // 检查手机号是否已存在
        const [existing] = await executeQuery(
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
        await executeQuery(
          `INSERT INTO members (
            member_no, nickname, gender, birth_year, phone, city, 
            type, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            memberNo,
            member.nickname,
            member.gender || 'unknown',
            member.birth_year || null,
            member.phone,
            member.city || '',
            member.type || 'NORMAL',
            member.status || 'ACTIVE'
          ]
        );

        successCount++;
      } catch (error) {
        logger.error('导入单个会员失败', { 
          member: member.nickname, 
          error: error instanceof Error ? error : new Error(String(error)) 
        });
        errors.push(`会员 ${member.nickname} 导入失败`);
        errorCount++;
      }
    }

    logger.info('批量导入会员完成', { successCount, errorCount, total: members.length });
    
    return createSuccessResponse({
        successCount,
        errorCount,
        errors: errors.slice(0, 10) // 只返回前10个错误
    }, `导入完成：成功 ${successCount} 个，失败 ${errorCount} 个`);
  } catch (error) {
    logger.error('批量导入会员失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse('批量导入失败', 500);
  }
} 