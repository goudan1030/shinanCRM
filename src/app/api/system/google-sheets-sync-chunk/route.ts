import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';
import { executeQuery } from '@/lib/database-netlify';
import { syncMemberToGoogleSheet } from '@/lib/google-sheets';

const logger = createLogger('api/system/google-sheets-sync-chunk');

const DEFAULT_BATCH_SIZE = 50;

interface SyncChunkRequestBody {
  lastId?: number | null;
  batchSize?: number;
}

interface SyncLogItem {
  memberId: number;
  memberNo: string;
  nickname: string | null;
  status: 'success' | 'error';
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as SyncChunkRequestBody;
    const lastId = body.lastId ?? null;
    const batchSize = Math.min(Math.max(body.batchSize ?? DEFAULT_BATCH_SIZE, 1), 200);

    // 1. 统计总数，方便前端展示整体进度
    const [countRows] = await executeQuery(
      'SELECT COUNT(*) AS total FROM members WHERE deleted = 0',
    );
    const total =
      Array.isArray(countRows) && countRows[0] && typeof countRows[0].total === 'number'
        ? (countRows[0].total as number)
        : 0;

    if (total === 0) {
      return createErrorResponse('数据库中没有可同步的会员数据', 400);
    }

    // 2. 拉取本批次数据
    let rowsQuery = 'SELECT * FROM members WHERE deleted = 0';
    const params: any[] = [];

    if (lastId) {
      rowsQuery += ' AND id > ?';
      params.push(lastId);
    }

    rowsQuery += ' ORDER BY id ASC LIMIT ?';
    params.push(batchSize);

    const [rows] = await executeQuery(rowsQuery, params);

    if (!Array.isArray(rows) || rows.length === 0) {
      // 没有更多数据了，直接返回完成状态
      return createSuccessResponse(
        {
          success: true,
          total,
          batchCount: 0,
          processedCount: 0,
          lastId,
          finished: true,
          logs: [] as SyncLogItem[],
          finishedAt: new Date().toISOString(),
        },
        '所有会员已同步完成',
      );
    }

    const logs: SyncLogItem[] = [];
    let successCount = 0;
    let errorCount = 0;
    let maxId = lastId;

    for (const member of rows as any[]) {
      maxId = typeof member.id === 'number' ? member.id : maxId;

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
        errorCount += 1;

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

    const processedCount = rows.length;
    const finished = total > 0 && maxId !== null && processedCount < batchSize;

    logger.info('本批次同步完成', {
      batchSize,
      processedCount,
      successCount,
      errorCount,
      lastId: maxId,
      finished,
    });

    return createSuccessResponse(
      {
        success: true,
        total,
        batchCount: processedCount,
        successCount,
        errorCount,
        processedCount,
        lastId: maxId,
        finished,
        logs,
        finishedAt: finished ? new Date().toISOString() : undefined,
      },
      finished
        ? `同步完成：本批 ${processedCount} 条，累计总数 ${total} 条`
        : `同步进行中：本批 ${processedCount} 条，后面还有数据待同步`,
    );
  } catch (error) {
    logger.error(
      '分批同步会员到 Google 表格失败',
      error instanceof Error ? error : new Error(String(error)),
    );
    return createErrorResponse('分批同步失败，请检查服务器日志和环境变量配置', 500);
  }
}



