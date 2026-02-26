import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { sendMemberRevocationNotification } from '@/lib/wecom-api';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const data = await request.json() as { reason?: string; notes?: string };
    
    // 获取会员ID
    const memberId = params.id;
    
    // 获取当前用户ID
    const currentUserId = request.headers.get('x-user-id');
    
    if (!currentUserId) {
      return NextResponse.json(
        { error: '未获取到操作人信息' },
        { status: 401 }
      );
    }
    
    console.log('会员ID:', memberId);

    // 查找会员
    const [memberRows] = await executeQuery(
      'SELECT id, status, nickname, member_no, type, phone, province, city FROM members WHERE id = ?',
      [memberId]
    );

    if (!memberRows || (memberRows as any[]).length === 0) {
      return NextResponse.json(
        { error: '会员不存在' },
        { status: 404 }
      );
    }

    const member = (memberRows as any[])[0];
    
    console.log('找到会员:', member);

    // 验证会员状态
    if (member.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: '只能撤销激活状态的会员' },
        { status: 400 }
      );
    }

    // 更新会员状态
    await executeQuery(
      'UPDATE members SET status = "REVOKED", updated_at = NOW() WHERE id = ?',
      [memberId]
    );

    // 记录撤销日志
    await executeQuery(
      'INSERT INTO member_type_logs (member_id, old_type, new_type, notes, created_at) VALUES (?, ?, ?, ?, NOW())',
      [
        memberId,
        member.type || 'NORMAL',
        'REVOKED',
        data.reason || data.notes || '管理员撤销'
      ]
    );

    const revokeTime = new Date();

    try {
      await sendMemberRevocationNotification(
        { ...member, status: 'REVOKED' },
        {
          reason: data.reason || data.notes,
          revokedAt: revokeTime,
          operatorId: currentUserId
        }
      );
    } catch (notifyError) {
      console.warn('会员撤销通知发送失败:', notifyError);
    }

    return NextResponse.json({ 
      message: '会员撤销成功',
      member: {
        id: member.id,
        member_no: member.member_no,
        nickname: member.nickname,
        status: 'REVOKED'
      }
    });

  } catch (error) {
    console.error('会员撤销失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '会员撤销失败' },
      { status: 500 }
    );
  }
}
