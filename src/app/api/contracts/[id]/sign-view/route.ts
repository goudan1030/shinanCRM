import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

// 获取合同签署页面所需的基本信息（无需认证）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contractId = parseInt(id);

    if (isNaN(contractId)) {
      return NextResponse.json(
        { error: '无效的合同ID' },
        { status: 400 }
      );
    }

    // 获取合同基本信息（只返回签署页面需要的字段，不包含会员信息）
    const queryResult = await executeQuery(
      `SELECT 
        id,
        contract_number,
        status,
        content,
        signed_at,
        expires_at
       FROM contracts 
       WHERE id = ?`,
      [contractId]
    );

    // executeQuery返回的是[rows, fields]格式
    const contractRows = Array.isArray(queryResult) && queryResult.length > 0 ? queryResult[0] : queryResult;

    if (!contractRows || !Array.isArray(contractRows) || contractRows.length === 0) {
      return NextResponse.json(
        { error: '合同不存在' },
        { status: 404 }
      );
    }

    const contract = contractRows[0];

    // 检查合同是否过期
    if (contract.expires_at && new Date(contract.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '合同已过期' },
        { status: 400 }
      );
    }

    // 只返回签署页面需要的信息，用户信息由用户自己填写
    const responseData = {
      id: contract.id,
      contract_number: contract.contract_number,
      status: contract.status,
      content: contract.content,
      signed_at: contract.signed_at,
      expires_at: contract.expires_at
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('获取合同签署信息失败:', error);
    return NextResponse.json(
      { error: '获取合同信息失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
