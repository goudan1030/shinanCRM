import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { recordOperationLog, OperationType, TargetType, buildOperationDetail } from '@/lib/log-operations';

// 修改会员状态
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    // 验证是否已登录
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const userEmail = (session.user as any).email;
    const { status, reason } = await request.json() as { 
      status: 'ACTIVE' | 'REVOKED',
      reason?: string
    };

    // 验证状态参数
    if (!status || !['ACTIVE', 'REVOKED'].includes(status)) {
      return NextResponse.json(
        { error: '无效的状态值' },
        { status: 400 }
      );
    }

    // 获取会员ID
    const memberId = params.id;
    
    // 先查询会员信息，用于记录日志
    const [members] = await pool.execute(
      'SELECT member_no, nickname, status FROM members WHERE id = ?',
      [memberId]
    );

    if ((members as any[]).length === 0) {
      return NextResponse.json(
        { error: '会员不存在' },
        { status: 404 }
      );
    }

    const member = (members as any[])[0];
    
    // 如果当前状态与目标状态相同，无需修改
    if (member.status === status) {
      return NextResponse.json({
        success: true,
        message: `会员状态已经是${status === 'ACTIVE' ? '激活' : '撤销'}状态`
      });
    }

    // 更新会员状态
    await pool.execute(
      'UPDATE members SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, memberId]
    );

    // 确定操作类型
    const operationType = status === 'ACTIVE'
      ? OperationType.ACTIVATE
      : OperationType.REVOKE;
    
    // 构建操作详情
    const operationName = status === 'ACTIVE' ? '激活' : '撤销';
    let detail = buildOperationDetail(
      operationName,
      member.nickname || member.member_no,
      reason ? `原因: ${reason}` : undefined
    );

    // 记录操作日志
    await recordOperationLog(
      pool,
      operationType,
      TargetType.MEMBER,
      memberId,
      userId,
      detail,
      userEmail
    );

    return NextResponse.json({
      success: true,
      message: `会员状态已修改为${status === 'ACTIVE' ? '激活' : '撤销'}`
    });

  } catch (error) {
    console.error('修改会员状态失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '修改失败' },
      { status: 500 }
    );
  }
} 