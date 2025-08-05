import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTokenFromCookieStore, verifyToken } from '@/lib/token';

// 会员升级
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 首先尝试使用next-auth获取会话
    const session = await getServerSession(authOptions);
    
    // 2. 如果next-auth没有会话，尝试使用自定义JWT token验证
    let isAuthenticated = !!session?.user;
    let userId = session?.user ? (session.user as any).id : undefined;
    
    if (!isAuthenticated) {
      // 尝试从cookie获取自定义token
      const token = await getTokenFromCookieStore();
      
      if (token) {
        const userData = verifyToken(token);
        if (userData) {
          isAuthenticated = true;
          userId = userData.id;
        }
      }
      
      // 如果还是未认证，尝试从请求头获取用户ID
      if (!isAuthenticated) {
        const userIdHeader = request.headers.get('x-user-id');
        if (userIdHeader) {
          isAuthenticated = true;
          userId = parseInt(userIdHeader);
        }
      }
    }
    
    // 验证是否已登录
    if (!isAuthenticated) {
      console.log('会员升级API: 认证失败，用户未登录');
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }
    
    console.log(`会员升级API: 认证成功，用户ID: ${userId}`);

    const { type, remainingMatches, reason, payment_time, expiry_time, notes } = await request.json() as { 
      type: 'NORMAL' | 'ANNUAL' | 'ONE_TIME',
      remainingMatches?: number,
      reason?: string,
      payment_time?: string,
      expiry_time?: string,
      notes?: string
    };

    // 验证类型参数
    if (!type || !['NORMAL', 'ANNUAL', 'ONE_TIME'].includes(type)) {
      return NextResponse.json(
        { error: '无效的会员类型' },
        { status: 400 }
      );
    }

    // 获取会员ID
    const memberId = params.id;
    
    // 先查询会员信息
    const [members] = await executeQuery(
      'SELECT member_no, nickname, type, remaining_matches FROM members WHERE id = ?',
      [memberId]
    );

    if ((members as any[]).length === 0) {
      return NextResponse.json(
        { error: '会员不存在' },
        { status: 404 }
      );
    }

    const member = (members as any[])[0];
    
    // 如果当前类型与目标类型相同，但需要调整匹配次数
    if (member.type === type && typeof remainingMatches === 'number') {
      // 更新会员匹配次数
      await executeQuery(
        'UPDATE members SET remaining_matches = ?, updated_at = NOW() WHERE id = ?',
        [remainingMatches, memberId]
      );

      return NextResponse.json({
        success: true,
        message: `会员匹配次数已调整为 ${remainingMatches} 次`
      });
    }
    
    // 如果当前类型与目标类型相同，无需修改类型
    if (member.type === type && typeof remainingMatches !== 'number') {
      return NextResponse.json({
        success: true,
        message: `会员已经是${type === 'ANNUAL' ? '年费' : '普通'}会员`
      });
    }

    // 确定新的匹配次数
    let newRemainingMatches = member.remaining_matches;
    if (typeof remainingMatches === 'number') {
      newRemainingMatches = remainingMatches;
    } else if (type === 'ANNUAL') {
      // 升级为年费会员默认增加匹配次数
      newRemainingMatches = (member.remaining_matches || 0) + 5;
    } else if (type === 'ONE_TIME') {
      // 一次性会员默认设置为1次匹配
      newRemainingMatches = 1;
    }

    // 更新会员类型和匹配次数
    await executeQuery(
      'UPDATE members SET type = ?, remaining_matches = ?, updated_at = NOW() WHERE id = ?',
      [type, newRemainingMatches, memberId]
    );

    // 记录升级日志（如果提供了notes）
    if (notes) {
      try {
        await executeQuery(
          'INSERT INTO member_operation_logs (member_id, operation_type, old_values, new_values, created_at, operator_id) VALUES (?, ?, ?, ?, NOW(), ?)',
          [
            memberId,
            'UPGRADE',
            JSON.stringify({ type: member.type, remaining_matches: member.remaining_matches }),
            JSON.stringify({ type, remaining_matches: newRemainingMatches, notes }),
            userId
          ]
        );
      } catch (logError) {
        console.warn('记录升级日志失败:', logError);
        // 不影响主要操作
      }
    }

    const typeText = type === 'ANNUAL' ? '年费会员' : type === 'ONE_TIME' ? '一次性会员' : '普通会员';
    
    return NextResponse.json({
      success: true,
      message: `会员已升级为${typeText}，匹配次数为 ${newRemainingMatches} 次`
    });

  } catch (error) {
    console.error('会员升级失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '升级失败' },
      { status: 500 }
    );
  }
}