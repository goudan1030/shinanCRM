import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = parseInt(params.id);
    
    if (!memberId || isNaN(memberId)) {
      return NextResponse.json({
        success: false,
        error: '无效的会员ID'
      }, { status: 400 });
    }

    // 软删除：标记为已删除而不是真正删除
    const [result] = await executeQuery(
      'UPDATE members SET deleted = 1, updated_at = NOW() WHERE id = ?',
      [memberId]
    );

    const updateResult = result as any;
    
    if (updateResult.affectedRows === 0) {
      return NextResponse.json({
        success: false,
        error: '会员不存在或已被删除'
      }, { status: 404 });
    }

    const response = NextResponse.json({
      success: true,
      message: '会员删除成功'
    });

    // 禁用缓存
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('删除会员失败:', error);
    
    const response = NextResponse.json({
      success: false,
      error: '删除会员失败'
    }, { status: 500 });

    // 禁用缓存
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  }
}