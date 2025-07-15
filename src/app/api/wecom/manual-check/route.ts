import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { sendMemberRegistrationNotification } from '@/lib/wecom-api';

interface MemberData {
  id: number;
  member_no: string;
  nickname?: string;
  wechat?: string;
  phone?: string;
  gender?: string;
  birth_year?: string;
  height?: string;
  weight?: string;
  education?: string;
  occupation?: string;
  province?: string;
  city?: string;
  district?: string;
  target_area?: string;
  house_car?: string;
  hukou_province?: string;
  hukou_city?: string;
  children_plan?: string;
  marriage_cert?: string;
  marriage_history?: string;
  sexual_orientation?: string;
  self_description?: string;
  partner_requirement?: string;
  type?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * 手动检查新会员并发送通知
 * 替代数据库触发器的方案
 * GET /api/wecom/manual-check
 */
export async function GET() {
  try {
    console.log('🔍 开始手动检查新会员...');
    
    // 防缓存头
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    // 1. 检查member_notification_queue表是否存在
    try {
      const [queueCheck] = await executeQuery(
        'SELECT 1 FROM member_notification_queue LIMIT 1'
      );
      console.log('✓ 通知队列表存在');
    } catch (error) {
      console.log('⚠️ 通知队列表不存在，使用备用方案');
      return await handleWithoutQueue();
    }

    // 2. 查找最近1小时内的新会员（未在队列中的）
    const [newMembers] = await executeQuery(`
      SELECT m.* 
      FROM members m 
      LEFT JOIN member_notification_queue q ON m.id = q.member_id 
      WHERE m.deleted = 0 
        AND m.status = 'ACTIVE' 
        AND m.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        AND q.member_id IS NULL
      ORDER BY m.created_at DESC 
      LIMIT 20
    `);

    const members = newMembers as MemberData[];
    
    if (!members || members.length === 0) {
      console.log('📭 没有发现新会员需要通知');
      return NextResponse.json({
        success: true,
        message: '没有新会员需要通知',
        checked: 0
      }, { headers });
    }

    console.log(`📋 发现 ${members.length} 个新会员需要通知`);

    let successCount = 0;
    let failCount = 0;

    // 3. 为每个新会员创建通知队列并发送通知
    for (const member of members) {
      try {
        console.log(`📤 处理会员: ${member.member_no || member.id}`);

        // 添加到通知队列
        await executeQuery(
          `INSERT INTO member_notification_queue (
            member_id, notification_type, status, created_at
          ) VALUES (?, 'NEW_MEMBER', 'PENDING', NOW())`,
          [member.id]
        );

        // 发送企业微信通知
        const notificationSuccess = await sendMemberRegistrationNotification(member);

        if (notificationSuccess) {
          // 更新队列状态为成功
          await executeQuery(
            `UPDATE member_notification_queue 
             SET status = 'SUCCESS', processed_at = NOW() 
             WHERE member_id = ? AND status = 'PENDING'`,
            [member.id]
          );
          
          console.log(`✅ 会员 ${member.member_no || member.id} 通知发送成功`);
          successCount++;
        } else {
          // 更新队列状态为失败
          await executeQuery(
            `UPDATE member_notification_queue 
             SET status = 'FAILED', error_message = '企业微信通知发送失败', retry_count = 1
             WHERE member_id = ? AND status = 'PENDING'`,
            [member.id]
          );
          
          console.log(`❌ 会员 ${member.member_no || member.id} 通知发送失败`);
          failCount++;
        }

      } catch (error) {
        console.error(`❌ 处理会员 ${member.id} 出错:`, error);
        failCount++;
      }
    }

    const result = {
      success: true,
      message: `检查完成`,
      statistics: {
        checked: members.length,
        success: successCount,
        failed: failCount,
        timestamp: new Date().toISOString()
      }
    };

    console.log('📊 检查结果:', result.statistics);
    
    return NextResponse.json(result, { headers });

  } catch (error) {
    console.error('❌ 手动检查新会员失败:', error);
    
    return NextResponse.json({
      success: false,
      error: '检查失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

/**
 * 备用方案：直接检查会员表并发送通知（不使用队列表）
 */
async function handleWithoutQueue() {
  console.log('🔄 使用备用方案：直接检查会员表');

  // 查找最近1小时内的新会员
  const [newMembers] = await executeQuery(`
    SELECT * FROM members 
    WHERE deleted = 0 
      AND status = 'ACTIVE' 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ORDER BY created_at DESC 
    LIMIT 10
  `);

  const members = newMembers as MemberData[];
  
  if (!members || members.length === 0) {
    return NextResponse.json({
      success: true,
      message: '没有新会员需要通知（备用方案）',
      checked: 0
    });
  }

  console.log(`📋 发现 ${members.length} 个新会员（备用方案）`);

  let successCount = 0;
  let failCount = 0;

  // 直接发送通知，不使用队列
  for (const member of members) {
    try {
      console.log(`📤 发送通知: ${member.member_no || member.id}`);
      
      const notificationSuccess = await sendMemberRegistrationNotification(member);
      
      if (notificationSuccess) {
        console.log(`✅ 会员 ${member.member_no || member.id} 通知发送成功`);
        successCount++;
      } else {
        console.log(`❌ 会员 ${member.member_no || member.id} 通知发送失败`);
        failCount++;
      }

    } catch (error) {
      console.error(`❌ 处理会员 ${member.id} 出错:`, error);
      failCount++;
    }
  }

  return NextResponse.json({
    success: true,
    message: '检查完成（备用方案）',
    statistics: {
      checked: members.length,
      success: successCount,
      failed: failCount,
      timestamp: new Date().toISOString(),
      mode: 'backup'
    }
  });
}

/**
 * 手动触发检查
 * POST /api/wecom/manual-check
 */
export async function POST() {
  return GET();
} 