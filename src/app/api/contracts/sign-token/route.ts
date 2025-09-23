import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

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

    // 创建数据库连接
    const connection = await mysql.createConnection({
      host: '8.149.244.105',
      user: 'h5_cloud_user',
      password: 'mc72TNcMmy6HCybH',
      port: 3306,
      database: 'h5_cloud_db',
      charset: 'utf8mb4'
    });

    // 验证令牌并获取合同信息
    const [tokenRows] = await connection.execute(
      `SELECT ct.*, c.id as contract_id, c.contract_number, c.status, c.content, c.variables, c.signed_at
       FROM contract_sign_tokens ct
       JOIN contracts c ON ct.contract_id = c.id
       WHERE ct.token = ? AND ct.expires_at > NOW()`,
      [token]
    );

    await connection.end();

    if (!tokenRows || (tokenRows as any[]).length === 0) {
      console.log('🔐 令牌验证API - 令牌无效或已过期');
      return NextResponse.json(
        { success: false, message: '无效或已过期的签署令牌' },
        { status: 404 }
      );
    }

    const tokenData = (tokenRows as any[])[0];
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
      variables: tokenData.variables ? (typeof tokenData.variables === 'string' ? JSON.parse(tokenData.variables) : tokenData.variables) : {},
      status: tokenData.status,
      signed_at: tokenData.signed_at
    };

    console.log('✅ 令牌验证成功，返回合同信息');

    return NextResponse.json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('验证签署令牌失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '验证签署令牌失败',
        error: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
