import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

/**
 * 通过令牌获取合同信息（用于客户签署）
 * GET /api/contracts/sign-token?token=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, message: '缺少签署令牌' },
        { status: 400 }
      );
    }

    console.log('🔐 令牌验证API - 收到请求，令牌:', token.substring(0, 10) + '...');

    // 验证令牌并获取合同信息
    const [tokenRows] = await executeQuery(
      `SELECT ct.*, c.id as contract_id, c.contract_number, c.status, c.content, c.variables,
              m.id as member_id, m.name as member_name, m.phone as member_phone, m.id_card as member_id_card
       FROM contract_sign_tokens ct
       JOIN contracts c ON ct.contract_id = c.id
       LEFT JOIN members m ON c.member_id = m.id
       WHERE ct.token = ? AND ct.expires_at > NOW()`,
      [token]
    );

    if (!tokenRows || tokenRows.length === 0) {
      console.log('🔐 令牌验证API - 令牌无效或已过期');
      return NextResponse.json(
        { success: false, message: '无效或已过期的签署令牌' },
        { status: 404 }
      );
    }

    const tokenData = tokenRows[0];
    console.log('🔐 令牌验证API - 找到合同:', tokenData.contract_id, '状态:', tokenData.status);

    if (tokenData.status !== 'PENDING') {
      console.log('🔐 令牌验证API - 合同状态不允许签署:', tokenData.status);
      return NextResponse.json(
        { success: false, message: '合同状态不允许签署' },
        { status: 400 }
      );
    }

    const contract = {
      id: tokenData.contract_id,
      contract_number: tokenData.contract_number,
      content: tokenData.content,
      variables: tokenData.variables ? JSON.parse(tokenData.variables) : {},
      status: tokenData.status,
      member: {
        id: tokenData.member_id,
        name: tokenData.member_name,
        phone: tokenData.member_phone,
        id_card: tokenData.member_id_card
      }
    };

    console.log('✅ 令牌验证成功，返回合同信息');

    return NextResponse.json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('验证签署令牌失败:', error);
    return NextResponse.json(
      { success: false, message: '验证签署令牌失败' },
      { status: 500 }
    );
  }
}
