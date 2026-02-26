import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';
import { executeQuery } from '@/lib/database-netlify';
import { syncMemberToGoogleSheet } from '@/lib/google-sheets';

const logger = createLogger('api/system/google-sheets-sync');

interface SyncLogItem {
  memberId: number;
  memberNo: string;
  nickname: string | null;
  status: 'success' | 'error';
  message?: string;
}

export async function POST(_request: NextRequest) {
  try {
    logger.info('开始全量同步会员到 Google 表格');

    const [rows] = await executeQuery(
      'SELECT * FROM members WHERE deleted = 0 ORDER BY id ASC',
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return createErrorResponse('数据库中没有可同步的会员数据', 400);
    }

    const logs: SyncLogItem[] = [];
    let successCount = 0;

    for (const member of rows as any[]) {
      try {
        await syncMemberToGoogleSheet({
          id: member.id,
          member_no: member.member_no,
          nickname: member.nickname,
          gender: member.gender,
          birth_year: member.birth_year,
          height: member.height,
          weight: member.weight,
          phone: member.phone,
          wechat: member.wechat,
          wechat_qrcode: member.wechat_qrcode,
          province: member.province,
          city: member.city,
          district: member.district,
          target_area: member.target_area,
          house_car: member.house_car,
          hukou_province: member.hukou_province,
          hukou_city: member.hukou_city,
          children_plan: member.children_plan,
          marriage_cert: member.marriage_cert,
          marriage_history: member.marriage_history,
          sexual_orientation: member.sexual_orientation,
          self_description: member.self_description,
          partner_requirement: member.partner_requirement,
          type: member.type,
          status: member.status,
          education: member.education,
          occupation: member.occupation,
          remaining_matches: member.remaining_matches,
          created_at: member.created_at
            ? new Date(member.created_at).toISOString()
            : null,
          updated_at: member.updated_at
            ? new Date(member.updated_at).toISOString()
            : null,
        });

        successCount += 1;
        logs.push({
          memberId: member.id,
          memberNo: member.member_no,
          nickname: member.nickname,
          status: 'success',
        });
      } catch (syncError) {
        const message =
          syncError instanceof Error ? syncError.message : String(syncError);
        logger.warn('同步单个会员到 Google 表格失败（忽略继续）', {
          memberId: member.id,
          error: message,
        });
        logs.push({
          memberId: member.id,
          memberNo: member.member_no,
          nickname: member.nickname,
          status: 'error',
          message,
        });
      }
    }

    const total = rows.length;
    const errorCount = total - successCount;

    logger.info('全量同步完成', {
      total,
      successCount,
      errorCount,
    });

    return createSuccessResponse(
      {
        success: true,
        total,
        successCount,
        errorCount,
        logs,
        finishedAt: new Date().toISOString(),
      },
      `全量同步完成：共 ${total} 条，成功 ${successCount} 条，失败 ${errorCount} 条`,
    );
  } catch (error) {
    logger.error(
      '全量同步会员到 Google 表格失败',
      error instanceof Error ? error : new Error(String(error)),
    );
    return createErrorResponse('全量同步失败，请检查服务器日志和环境变量配置', 500);
  }
}



