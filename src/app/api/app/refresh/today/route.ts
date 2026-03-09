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

    // 为每个用户生成【最近 4 小时】内随机的刷新时间，避免全部显示“X小时前”相同而显得假
    const HOURS_SPAN = 4;
    const now = new Date();
    const windowStart = new Date(now.getTime() - HOURS_SPAN * 60 * 60 * 1000);
    const totalDuration = now.getTime() - windowStart.getTime();

    const generateRandomTimes = (count: number) => {
      if (count <= 0 || totalDuration <= 0) {
        return [];
      }

      // 将 4 小时区间划分为均匀小段，每段内随机取一点，再打乱，保证分布均匀且不扎堆
      const segmentSize = totalDuration / count;
      const times = Array.from({ length: count }, (_, index) => {
        const segmentStart = Math.floor(windowStart.getTime() + segmentSize * index);
        const segmentEnd = index === count - 1
          ? now.getTime()
          : Math.floor(segmentStart + segmentSize);
        const range = Math.max(segmentEnd - segmentStart, 1);
        const offset = range > 1 ? randomInt(range) : 0;
        const timestamp = Math.min(segmentStart + offset, now.getTime());
        return new Date(timestamp);
      });

      // 打乱顺序，避免会员ID与时间顺序一一对应
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
      message: `成功刷新 ${updatedCount} 位会员的更新时间（最近4小时内随机分布）`,
      data: {
        updateTimeRange: {
          start: windowStart.toISOString().slice(0, 19).replace('T', ' '),
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
