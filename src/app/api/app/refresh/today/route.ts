import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, getNetlifyPool } from '@/lib/database-netlify';
import { randomInt } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // 随机抽取100名未删除、且未标记为"找到"的会员进行刷新
    // is_success = 1 表示已找到对象，不再需要刷新曝光
    const [allMembers] = await executeQuery(
      `SELECT id FROM members
       WHERE deleted = 0
         AND (is_success IS NULL OR is_success = 0)
       ORDER BY RAND()
       LIMIT 100`
    );

    if (allMembers.length === 0) {
      return NextResponse.json({
        success: false,
        error: '没有找到可刷新的会员（所有会员均已标记为"找到"或已删除）'
      });
    }

    const memberIds = allMembers.map((member: any) => member.id);
    
    // 为每个用户生成4小时内随机的刷新时间
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4小时前
    const totalDuration = now.getTime() - fourHoursAgo.getTime();

    const generateRandomTimes = (count: number) => {
      if (count <= 0 || totalDuration <= 0) {
        return [];
      }

      // 将区间划分为均匀的小段，再在每个小段内随机取值，保证分布均匀且不扎堆
      const segmentSize = totalDuration / count;
      const times = Array.from({ length: count }, (_, index) => {
        const segmentStart = Math.floor(fourHoursAgo.getTime() + segmentSize * index);
        const segmentEnd = index === count - 1
          ? now.getTime()
          : Math.floor(segmentStart + segmentSize);
        const range = Math.max(segmentEnd - segmentStart, 1);
        const offset = range > 1 ? randomInt(range) : 0;
        const timestamp = Math.min(segmentStart + offset, now.getTime());
        return new Date(timestamp);
      });

      // 打乱顺序，避免会员ID顺序和时间顺序相关联
      for (let i = times.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [times[i], times[j]] = [times[j], times[i]];
      }

      return times;
    };

    const randomTimes = generateRandomTimes(memberIds.length);
    
    // 批量更新每个会员的更新时间为随机时间
    let updatedCount = 0;

    const pool = getNetlifyPool();
    const connection = await pool.getConnection();

    try {
      for (let index = 0; index < memberIds.length; index++) {
        const memberId = memberIds[index];
        const randomTime = randomTimes[index] || now;
        const unixTime = Math.floor(randomTime.getTime() / 1000);

        // 设置会员的更新时间
        await connection.query(
          'UPDATE members SET updated_at = FROM_UNIXTIME(?) WHERE id = ?',
          [unixTime, memberId]
        );
        
        updatedCount++;
      }
    } finally {
      connection.release();
    }

    return NextResponse.json({
      success: true,
      count: updatedCount,
      message: `成功刷新 ${updatedCount} 位会员的更新时间（4小时内随机分布）`,
      data: {
        updateTimeRange: {
          start: fourHoursAgo.toISOString().slice(0, 19).replace('T', ' '),
          end: now.toISOString().slice(0, 19).replace('T', ' ')
        },
        memberCount: updatedCount
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
