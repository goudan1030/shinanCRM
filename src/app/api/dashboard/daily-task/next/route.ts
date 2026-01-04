import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * 获取下一个要发布的女生
 * GET /api/dashboard/daily-task/next
 */
export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. 首先检查今天是否已经有任务记录（pending或published状态的）
    const [existingTasksResult] = await executeQuery(
      `SELECT member_id FROM daily_tasks 
       WHERE task_date = ? AND status IN ('pending', 'published')
       ORDER BY id ASC`,
      [today]
    );

    let memberIds: number[] = [];
    if (Array.isArray(existingTasksResult) && existingTasksResult.length > 0) {
      // 如果今天已经有任务记录，直接使用这些会员ID
      memberIds = existingTasksResult.map((row: any) => Number(row.member_id));
    } else {
      // 如果今天还没有任务记录，随机选择20个女性会员
      const [allMembersResult] = await executeQuery(
        `SELECT COUNT(*) as total FROM members 
         WHERE gender = 'female' AND status = 'ACTIVE' 
         AND (deleted IS NULL OR deleted = FALSE)`
      );

      const totalFemaleMembers = Array.isArray(allMembersResult) && allMembersResult[0] 
        ? Number(allMembersResult[0].total) || 0 
        : 0;

      if (totalFemaleMembers === 0) {
        return createSuccessResponse({
          members: [],
          publishedCount: 0,
          totalCount: 0
        }, '没有可发布的女性会员');
      }

      // 随机选择20个女性会员
      const [randomMembersResult] = await executeQuery(
        `SELECT id, member_no, nickname, wechat, phone, 
                birth_year, height, weight, education, occupation,
                province, city, district, target_area, house_car,
                hukou_province, hukou_city, children_plan, marriage_cert,
                marriage_history, sexual_orientation, self_description,
                partner_requirement
         FROM members 
         WHERE gender = 'female' 
           AND status = 'ACTIVE'
           AND (deleted IS NULL OR deleted = FALSE)
         ORDER BY RAND() LIMIT 20`
      );

      if (!Array.isArray(randomMembersResult) || randomMembersResult.length === 0) {
        return createSuccessResponse({
          members: [],
          publishedCount: 0,
          totalCount: totalFemaleMembers
        }, '没有可发布的女性会员');
      }

      // 为每个会员创建任务记录
      for (const member of randomMembersResult) {
        await executeQuery(
          `INSERT INTO daily_tasks (task_date, member_id, member_no, status)
           VALUES (?, ?, ?, 'pending')
           ON DUPLICATE KEY UPDATE updated_at = NOW()`,
          [today, member.id, member.member_no]
        );
        memberIds.push(Number(member.id));
      }
    }

    // 2. 根据会员ID获取完整的会员信息
    if (memberIds.length === 0) {
      return createSuccessResponse({
        members: [],
        publishedCount: 0,
        totalCount: 0
      }, '没有可发布的女性会员');
    }

    const placeholders = memberIds.map(() => '?').join(',');
    const [result] = await executeQuery(
      `SELECT id, member_no, nickname, wechat, phone, 
              birth_year, height, weight, education, occupation,
              province, city, district, target_area, house_car,
              hukou_province, hukou_city, children_plan, marriage_cert,
              marriage_history, sexual_orientation, self_description,
              partner_requirement
       FROM members 
       WHERE id IN (${placeholders})
       ORDER BY FIELD(id, ${placeholders})`,
      [...memberIds, ...memberIds]
    );

    // 3. 获取今日已发布的会员ID列表（用于统计）
    const [publishedResult] = await executeQuery(
      `SELECT DISTINCT member_id FROM daily_tasks 
       WHERE task_date = ? AND status = 'published'`,
      [today]
    );

    const publishedMemberIds: number[] = [];
    if (Array.isArray(publishedResult)) {
      publishedResult.forEach((row: any) => {
        if (row.member_id) {
          publishedMemberIds.push(Number(row.member_id));
        }
      });
    }

    // 7. 格式化返回数据
    const members = result.map((member: any) => ({
      id: member.id,
      member_no: member.member_no,
      nickname: member.nickname || '',
      wechat: member.wechat || '',
      phone: member.phone || '',
      birth_year: member.birth_year,
      height: member.height,
      weight: member.weight,
      education: member.education || '',
      occupation: member.occupation || '',
      province: member.province || '',
      city: member.city || '',
      district: member.district || '',
      target_area: member.target_area || '',
      house_car: member.house_car || '',
      hukou_province: member.hukou_province || '',
      hukou_city: member.hukou_city || '',
      children_plan: member.children_plan || '',
      marriage_cert: member.marriage_cert || '',
      marriage_history: member.marriage_history || '',
      sexual_orientation: member.sexual_orientation || '',
      self_description: member.self_description || '',
      partner_requirement: member.partner_requirement || ''
    }));

    return createSuccessResponse({
      members,
      publishedCount: publishedMemberIds.length,
      totalCount: members.length
    }, '获取要发布的女生列表成功');

  } catch (error) {
    console.error('获取下一个要发布的女生失败:', error);
    return createErrorResponse('获取下一个要发布的女生失败', 500);
  }
}
