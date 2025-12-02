import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';
import { executeQuery } from '@/lib/database-netlify';
import { syncMemberToGoogleSheet } from '@/lib/google-sheets';

const logger = createLogger('api/system/google-sheets-test');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { memberId } = body as { memberId?: number };

    // 1）如果传入了 memberId，只同步这一条
    if (memberId) {
      const [rows] = await executeQuery('SELECT * FROM members WHERE id = ?', [
        memberId,
      ]);
      const member = Array.isArray(rows) ? rows[0] : null;

      if (!member) {
        return createErrorResponse('指定的会员不存在', 404);
      }

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

      logger.info('谷歌表格同步测试成功', { memberId });

      return createSuccessResponse(
        {
          success: true,
          memberId,
          checkedAt: new Date().toISOString(),
        },
        '已同步指定会员到 Google 表格，请在表格中检查对应记录',
      );
    }

    // 2）没传 memberId：默认拉取「最后 10 条未删除会员」并全部同步
    logger.info('未提供 memberId，默认同步最近 10 条未删除会员');

    const [rows] = await executeQuery(
      'SELECT * FROM members WHERE deleted = 0 ORDER BY id DESC LIMIT 10',
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return createErrorResponse('数据库中没有可用的会员数据', 400);
    }

    const memberIds: number[] = [];

    for (const member of rows as any[]) {
      memberIds.push(member.id);

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
    }

    logger.info('谷歌表格同步测试成功（最近 10 条）', { memberIds });

    return createSuccessResponse(
      {
        success: true,
        memberIds,
        count: memberIds.length,
        checkedAt: new Date().toISOString(),
      },
      `已同步最近 ${memberIds.length} 条未删除会员到 Google 表格，请在表格中按 ID 检查对应记录`,
    );
  } catch (error) {
    logger.error(
      '谷歌表格同步测试失败',
      error instanceof Error ? error : new Error(String(error)),
    );
    return createErrorResponse('谷歌表格同步测试失败，请检查服务器日志和环境变量配置', 500);
  }
}


