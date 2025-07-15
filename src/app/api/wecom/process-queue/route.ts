import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { sendMemberRegistrationNotification } from '@/lib/wecom-api';

interface NotificationQueueItem {
  id: number;
  member_id: number;
  notification_type: 'NEW_MEMBER' | 'UPDATE_MEMBER';
  retry_count: number;
}

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
 * 处理企业微信通知队列
 * GET /api/wecom/process-queue
 */
export async function GET() {
  try {
    console.log('🔄 开始处理企业微信通知队列...');
    
    // 防缓存头
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    // 1. 获取待处理的通知队列
    const [queueItems] = await executeQuery(
      `SELECT id, member_id, notification_type, retry_count 
       FROM member_notification_queue 
       WHERE status = 'PENDING' 
       AND retry_count < 3 
       ORDER BY created_at ASC 
       LIMIT 10`
    );

    const items = queueItems as NotificationQueueItem[];
    
    if (!items || items.length === 0) {
      console.log('📭 通知队列为空，无需处理');
      return NextResponse.json({
        success: true,
        message: '队列为空',
        processed: 0
      }, { headers });
    }

    console.log(`📋 找到 ${items.length} 条待处理通知`);

    let successCount = 0;
    let failCount = 0;

    // 2. 逐个处理通知
    for (const item of items) {
      try {
        console.log(`📤 处理通知队列 ID: ${item.id}, 会员ID: ${item.member_id}`);

        // 更新状态为处理中
        await executeQuery(
          `UPDATE member_notification_queue 
           SET status = 'PROCESSING', processed_at = NOW() 
           WHERE id = ?`,
          [item.id]
        );

        // 获取会员详细信息
        const [memberRows] = await executeQuery(
          `SELECT * FROM members WHERE id = ? AND deleted = 0`,
          [item.member_id]
        );

        const members = memberRows as MemberData[];
        
        if (!members || members.length === 0) {
          console.log(`⚠️ 会员ID ${item.member_id} 不存在或已删除，跳过通知`);
          
          // 标记为失败
          await executeQuery(
            `UPDATE member_notification_queue 
             SET status = 'FAILED', 
                 error_message = '会员不存在或已删除',
                 retry_count = retry_count + 1
             WHERE id = ?`,
            [item.id]
          );
          failCount++;
          continue;
        }

        const memberData = members[0];
        console.log(`👤 获取到会员信息: ${memberData.member_no || memberData.id}`);

        // 发送企业微信通知
        const notificationSuccess = await sendMemberRegistrationNotification(memberData);

        if (notificationSuccess) {
          // 标记为成功
          await executeQuery(
            `UPDATE member_notification_queue 
             SET status = 'SUCCESS', processed_at = NOW() 
             WHERE id = ?`,
            [item.id]
          );
          
          console.log(`✅ 会员 ${memberData.member_no || memberData.id} 通知发送成功`);
          successCount++;
        } else {
          // 标记为失败，增加重试次数
          await executeQuery(
            `UPDATE member_notification_queue 
             SET status = 'PENDING', 
                 error_message = '企业微信通知发送失败',
                 retry_count = retry_count + 1
             WHERE id = ?`,
            [item.id]
          );
          
          console.log(`❌ 会员 ${memberData.member_no || memberData.id} 通知发送失败`);
          failCount++;
        }

      } catch (error) {
        console.error(`❌ 处理通知队列 ID ${item.id} 出错:`, error);
        
        // 标记为失败，增加重试次数
        await executeQuery(
          `UPDATE member_notification_queue 
           SET status = 'PENDING', 
               error_message = ?,
               retry_count = retry_count + 1
           WHERE id = ?`,
          [error instanceof Error ? error.message : '处理出错', item.id]
        );
        failCount++;
      }
    }

    // 3. 清理过期记录（可选）
    try {
      await executeQuery(
        `DELETE FROM member_notification_queue 
         WHERE status = 'SUCCESS' 
         AND processed_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`
      );
      
      await executeQuery(
        `DELETE FROM member_notification_queue 
         WHERE status = 'FAILED' 
         AND retry_count >= 3 
         AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
      );
    } catch (cleanupError) {
      console.error('清理过期记录失败:', cleanupError);
    }

    const result = {
      success: true,
      message: `处理完成`,
      statistics: {
        total: items.length,
        success: successCount,
        failed: failCount,
        timestamp: new Date().toISOString()
      }
    };

    console.log('📊 处理结果:', result.statistics);
    
    return NextResponse.json(result, { headers });

  } catch (error) {
    console.error('❌ 处理通知队列失败:', error);
    
    return NextResponse.json({
      success: false,
      error: '处理队列失败',
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
 * 手动触发队列处理
 * POST /api/wecom/process-queue
 */
export async function POST() {
  // 直接调用 GET 方法
  return GET();
} 