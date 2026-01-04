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

    // 1. 获取今日已发布的会员ID列表
    const [publishedResult] = await executeQuery(
      `SELECT DISTINCT member_id FROM daily_tasks 
       WHERE task_date = ? AND status IN ('published', 'completed')`,
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

    // 2. 获取所有女性会员（状态为ACTIVE）
    let query = `
      SELECT id, member_no, nickname, wechat, phone, 
             birth_year, height, weight, education, occupation,
             province, city, district, target_area, house_car,
             hukou_province, hukou_city, children_plan, marriage_cert,
             marriage_history, sexual_orientation, self_description,
             partner_requirement
      FROM members 
      WHERE gender = 'female' 
        AND status = 'ACTIVE'
        AND (deleted IS NULL OR deleted = FALSE)
    `;

    const queryParams: any[] = [];

    // 3. 如果今日已发布过，排除已发布的会员
    if (publishedMemberIds.length > 0) {
      query += ` AND id NOT IN (${publishedMemberIds.map(() => '?').join(',')})`;
      queryParams.push(...publishedMemberIds);
    }

    // 4. 如果所有女性会员都已发布，则重新开始循环（清空今日记录，重新开始）
    const [allMembersResult] = await executeQuery(
      `SELECT COUNT(*) as total FROM members 
       WHERE gender = 'female' AND status = 'ACTIVE' 
       AND (deleted IS NULL OR deleted = FALSE)`
    );

    const totalFemaleMembers = Array.isArray(allMembersResult) && allMembersResult[0] 
      ? Number(allMembersResult[0].total) || 0 
      : 0;

    // 如果所有会员都已发布，重置今日任务
    if (publishedMemberIds.length > 0 && publishedMemberIds.length >= totalFemaleMembers) {
      // 删除今日所有任务记录，重新开始
      await executeQuery(
        `DELETE FROM daily_tasks WHERE task_date = ?`,
        [today]
      );
    }

    // 5. 随机选择20个未发布的女性会员
    query += ` ORDER BY RAND() LIMIT 20`;

    const [result] = await executeQuery(query, queryParams);

    if (!Array.isArray(result) || result.length === 0) {
      return createSuccessResponse({
        members: [],
        publishedCount: publishedMemberIds.length,
        totalCount: totalFemaleMembers
      }, '没有可发布的女性会员');
    }

    // 6. 为每个会员创建任务记录（如果不存在）
    for (const member of result) {
      await executeQuery(
        `INSERT INTO daily_tasks (task_date, member_id, member_no, status)
         VALUES (?, ?, ?, 'pending')
         ON DUPLICATE KEY UPDATE updated_at = NOW()`,
        [today, member.id, member.member_no]
      );
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
      totalCount: totalFemaleMembers
    }, '获取要发布的女生列表成功');

  } catch (error) {
    console.error('获取下一个要发布的女生失败:', error);
    return createErrorResponse('获取下一个要发布的女生失败', 500);
  }
}
