import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const data = await request.json() as { reason?: string; notes?: string };
    
    // 获取当前用户ID
    const currentUserId = request.headers.get('x-user-id');
    
    if (!currentUserId) {
      return NextResponse.json(
        { error: '未获取到操作人信息' },
        { status: 401 }
      );
    }

    // 获取当前会员状态和信息
    const [memberRows] = await executeQuery(
      'SELECT id, status, nickname, member_no, type FROM members WHERE id = ?',
      [params.id]
    );

    if (!memberRows || (memberRows as any[]).length === 0) {
      return NextResponse.json(
        { error: '会员不存在' },
        { status: 404 }
      );
    }

    const member = (memberRows as any[])[0];

    // 验证会员状态
    if (member.status !== 'REVOKED') {
      return NextResponse.json(
        { error: '只能激活已撤销的会员' },
        { status: 400 }
      );
    }

    // 更新会员状态
    await executeQuery(
      'UPDATE members SET status = ?, updated_at = NOW() WHERE id = ?',
      ['ACTIVE', params.id]
    );

    // 记录激活日志
    await executeQuery(
      'INSERT INTO member_type_logs (member_id, old_type, new_type, notes, created_at) VALUES (?, ?, ?, ?, NOW())',
      [
        params.id,
        'REVOKED',
        member.type || 'NORMAL',
        data.reason || data.notes || '管理员激活'
      ]
    );

    return NextResponse.json({ 
      message: '会员激活成功',
      member: {
        id: member.id,
        member_no: member.member_no,
        nickname: member.nickname,
        status: 'ACTIVE'
      }
    });

  } catch (error) {
    console.error('会员激活失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '会员激活失败' },
      { status: 500 }
    );
  }
}