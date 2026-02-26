import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const memberId = parseInt(resolvedParams.id);
    
    if (isNaN(memberId)) {
      return NextResponse.json({
        success: false,
        error: '无效的会员ID'
      }, { status: 400 });
    }

    console.log(`查询会员 ${memberId} 的推送状态`);

    // 修复：先通过members.id找到对应的users.id，再查询设备令牌
    const query = `
      SELECT 
        dt.id,
        dt.platform,
        dt.is_active,
        dt.last_used_at,
        dt.created_at,
        dt.updated_at
      FROM device_tokens dt
      INNER JOIN users u ON dt.user_id = u.id
      INNER JOIN members m ON u.id = m.user_id
      WHERE m.id = ?
      ORDER BY dt.updated_at DESC
      LIMIT 1
    `;

    console.log(`执行SQL查询: ${query.replace(/\s+/g, ' ').trim()}`);
    const result = await executeQuery(query, [memberId]);
    console.log(`查询结果:`, result);

    // 检查是否有实际的数据行（排除表结构信息）
    const hasDataRows = Array.isArray(result) && result.length > 0 &&
                       Array.isArray(result[0]) && result[0].length > 0;

    if (!hasDataRows) {
      console.log(`会员 ${memberId} 没有设备令牌记录`);
      return NextResponse.json({
        success: true,
        data: {
          hasDevice: false,
          isActive: false,
          platform: null,
          lastActive: null
        }
      });
    }

    // 获取第一行数据（排除表结构信息）
    const dataRows = result[0];
    const deviceToken = dataRows[0];
    console.log(`会员 ${memberId} 的设备令牌:`, deviceToken);
    
    // 检查设备是否激活
    const isActive = deviceToken.is_active === 1;
    
    return NextResponse.json({
      success: true,
      data: {
        hasDevice: true,
        isActive: isActive,
        platform: deviceToken.platform,
        lastActive: deviceToken.last_used_at || deviceToken.updated_at
      }
    });

  } catch (error) {
    console.error('查询推送状态失败:', error);
    return NextResponse.json({
      success: false,
      error: '查询推送状态失败'
    }, { status: 500 });
  }
}
