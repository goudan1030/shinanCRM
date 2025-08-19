import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

export async function POST(request: NextRequest) {
  try {
    // 随机选择100位用户并更新他们的refresh_time
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // 首先获取所有非删除的会员ID
    const [allMembers] = await executeQuery(
      'SELECT id FROM members WHERE deleted = 0 ORDER BY RAND() LIMIT 100'
    );

    if (allMembers.length === 0) {
      return NextResponse.json({
        success: false,
        error: '没有找到可刷新的会员'
      });
    }

    const memberIds = allMembers.map((member: any) => member.id);
    
    // 批量更新这些会员的refresh_time
    const placeholders = memberIds.map(() => '?').join(',');
    const updateQuery = `UPDATE members SET refresh_time = ?, updated_at = NOW() WHERE id IN (${placeholders})`;
    
    await executeQuery(updateQuery, [currentTime, ...memberIds]);

    return NextResponse.json({
      success: true,
      count: memberIds.length,
      message: `成功刷新 ${memberIds.length} 位会员的刷新时间`,
      data: {
        refreshTime: currentTime,
        memberCount: memberIds.length
      }
    });

  } catch (error) {
    console.error('今日刷新失败:', error);
    return NextResponse.json({
      success: false,
      error: '执行今日刷新失败'
    }, { status: 500 });
  }
}
