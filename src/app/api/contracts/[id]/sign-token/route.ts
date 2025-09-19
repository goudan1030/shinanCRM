import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import crypto from 'crypto';

/**
 * 生成合同签署令牌
 * POST /api/contracts/[id]/sign-token
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = parseInt(params.id);
    
    if (isNaN(contractId)) {
      return NextResponse.json(
        { success: false, message: '无效的合同ID' },
        { status: 400 }
      );
    }

    const connection = await createClient();

    try {
      // 验证合同是否存在且状态为PENDING
      const [contractRows] = await connection.execute(
        'SELECT id, status, member_id FROM contracts WHERE id = ?',
        [contractId]
      );

      if (!contractRows || (contractRows as any[]).length === 0) {
        return NextResponse.json(
          { success: false, message: '合同不存在' },
          { status: 404 }
        );
      }

      const contract = (contractRows as any[])[0];
      
      if (contract.status !== 'PENDING') {
        return NextResponse.json(
          { success: false, message: '合同状态不允许签署' },
          { status: 400 }
        );
      }

      // 生成安全的签署令牌
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24小时有效期

      // 将令牌存储到数据库
      await connection.execute(
        `INSERT INTO contract_sign_tokens (contract_id, token, expires_at, created_at) 
         VALUES (?, ?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE 
         token = VALUES(token), 
         expires_at = VALUES(expires_at), 
         created_at = NOW()`,
        [contractId, token, expiresAt]
      );

      // 生成安全的签署链接
      const signUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/contracts/sign?token=${token}`;

      console.log(`✅ 为合同 ${contractId} 生成签署令牌: ${token}`);

      return NextResponse.json({
        success: true,
        token,
        signUrl,
        expiresAt: expiresAt.toISOString()
      });

    } finally {
      connection.end();
    }

  } catch (error) {
    console.error('生成签署令牌失败:', error);
    return NextResponse.json(
      { success: false, message: '生成签署令牌失败' },
      { status: 500 }
    );
  }
}

/**
 * 验证合同签署令牌
 * GET /api/contracts/[id]/sign-token?token=xxx
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, message: '缺少签署令牌' },
        { status: 400 }
      );
    }

    const connection = await createClient();

    try {
      // 验证令牌
      const [tokenRows] = await connection.execute(
        `SELECT ct.*, c.id as contract_id, c.contract_number, c.status, c.content, c.variables,
                m.id as member_id, m.name as member_name, m.phone as member_phone, m.id_card as member_id_card
         FROM contract_sign_tokens ct
         JOIN contracts c ON ct.contract_id = c.id
         LEFT JOIN members m ON c.member_id = m.id
         WHERE ct.token = ? AND ct.expires_at > NOW()`,
        [token]
      );

      if (!tokenRows || (tokenRows as any[]).length === 0) {
        return NextResponse.json(
          { success: false, message: '无效或已过期的签署令牌' },
          { status: 404 }
        );
      }

      const tokenData = (tokenRows as any[])[0];

      if (tokenData.status !== 'PENDING') {
        return NextResponse.json(
          { success: false, message: '合同状态不允许签署' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        contract: {
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
        }
      });

    } finally {
      connection.end();
    }

  } catch (error) {
    console.error('验证签署令牌失败:', error);
    return NextResponse.json(
      { success: false, message: '验证签署令牌失败' },
      { status: 500 }
    );
  }
}
