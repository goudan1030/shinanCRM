import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { SignContractRequest, SignContractResponse } from '@/types/contract';
import crypto from 'crypto';

// 签署合同
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = parseInt(params.id);
    const body: SignContractRequest = await request.json();
    const { signatureData, signerType } = body;

    if (isNaN(contractId)) {
      return NextResponse.json(
        { error: '无效的合同ID' },
        { status: 400 }
      );
    }

    if (!signatureData || !signerType) {
      return NextResponse.json(
        { error: '缺少必需参数' },
        { status: 400 }
      );
    }

    // 获取合同信息
    const [contractRows] = await executeQuery(
      'SELECT * FROM contracts WHERE id = ?',
      [contractId]
    );

    if (!contractRows || contractRows.length === 0) {
      return NextResponse.json(
        { error: '合同不存在' },
        { status: 404 }
      );
    }

    const contract = contractRows[0];

    // 检查合同状态
    if (contract.status !== 'PENDING') {
      return NextResponse.json(
        { error: '合同状态不允许签署' },
        { status: 400 }
      );
    }

    // 检查合同是否过期
    if (contract.expires_at && new Date(contract.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '合同已过期' },
        { status: 400 }
      );
    }

    // 生成签名哈希
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const signatureHash = crypto
      .createHash('sha256')
      .update(signatureData + timestamp + nonce)
      .digest('hex');

    // 获取客户端信息
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 记录签署信息
    await executeQuery(
      `INSERT INTO contract_signatures (
        contract_id, signer_type, signature_data, signature_hash, 
        ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [contractId, signerType, signatureData, signatureHash, ipAddress, userAgent]
    );

    // 更新合同状态为已签署
    await executeQuery(
      'UPDATE contracts SET status = ?, signed_at = NOW(), updated_at = NOW() WHERE id = ?',
      ['SIGNED', contractId]
    );

    // 生成PDF（这里先返回成功，PDF生成可以异步处理）
    const pdfUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/contracts/${contractId}/pdf`;

    const response: SignContractResponse = {
      success: true,
      pdfUrl,
      message: '合同签署成功'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('签署合同失败:', error);
    return NextResponse.json(
      { error: '签署合同失败' },
      { status: 500 }
    );
  }
}
