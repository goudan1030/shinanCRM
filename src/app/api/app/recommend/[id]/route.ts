import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

// 取消推荐会员
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = params.id;

    if (!memberId) {
      return NextResponse.json({
        success: false,
        error: '会员ID不能为空'
      }, { status: 400 });
    }

    // 检查会员是否存在且是推荐会员
    const [existingMembers] = await executeQuery(
      'SELECT * FROM members WHERE id = ? AND is_recommended = 1 AND deleted = 0',
      [memberId]
    );

    if ((existingMembers as any[]).length === 0) {
      return NextResponse.json({
        success: false,
        error: '推荐会员不存在'
      }, { status: 404 });
    }

    // 取消推荐
    await executeQuery(
      'UPDATE members SET is_recommended = 0, updated_at = NOW() WHERE id = ?',
      [memberId]
    );

    const member = (existingMembers as any[])[0];

    return NextResponse.json({
      success: true,
      message: '取消推荐成功',
      data: {
        memberId,
        memberNo: member.member_no,
        nickname: member.nickname
      }
    });
  } catch (error) {
    console.error('取消推荐会员失败:', error);
    return NextResponse.json({
      success: false,
      error: '取消推荐会员失败'
    }, { status: 500 });
  }
}
