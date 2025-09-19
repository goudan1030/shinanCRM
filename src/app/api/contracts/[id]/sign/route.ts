import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/database';
import { executeQuery } from '@/lib/database-netlify';

// 更新合同内容以显示客户填写的信息
async function updateContractContentWithSignature(contractId: number, signerInfo: any) {
  try {
    // 获取当前合同内容
    const [contractRows] = await executeQuery(
      'SELECT content FROM contracts WHERE id = ?',
      [contractId]
    );

    if (!contractRows || (contractRows as any[]).length === 0) {
      console.error('合同不存在:', contractId);
      return;
    }

    const contract = (contractRows as any[])[0];
    let content = contract.content;

    if (!content) {
      console.error('合同内容为空:', contractId);
      return;
    }

    // 替换甲方信息为实际填写的信息
    if (signerInfo?.realName) {
      content = content.replace(
        /<p><strong>甲方（签字）：<\/strong><\/p>\s*<p>身份证号：待客户填写<\/p>\s*<p>联系电话：待客户填写<\/p>/,
        `<p><strong>甲方（签字）：</strong> ${signerInfo.realName}</p>
         <p>身份证号：${signerInfo.idCard || '待客户填写'}</p>
         <p>联系电话：${signerInfo.phone || '待客户填写'}</p>`
      );
    }

    // 更新合同内容
    await executeQuery(
      'UPDATE contracts SET content = ?, updated_at = NOW() WHERE id = ?',
      [content, contractId]
    );

    console.log('✅ 合同内容已更新，显示客户填写的信息');
  } catch (error) {
    console.error('更新合同内容失败:', error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = parseInt(params.id);
    const body = await request.json();
    const { signatureData, signerType, signerInfo } = body;

    if (!signatureData) {
      return NextResponse.json(
        { success: false, message: '签名数据不能为空' },
        { status: 400 }
      );
    }

    const connection = await createClient();

    try {
      // 开始事务
      await connection.beginTransaction();

      // 更新合同状态为已签署
      await connection.execute(
        `UPDATE contracts 
         SET status = 'SIGNED', 
             signed_at = NOW(),
             signature_data = ?,
             signature_hash = SHA2(?, 256)
         WHERE id = ?`,
        [JSON.stringify({ signatureData, signerType, signerInfo }), signatureData, contractId]
      );

      // 插入签署记录
      await connection.execute(
        `INSERT INTO contract_signatures 
         (contract_id, signer_type, signature_data, signature_hash, signed_at, ip_address, user_agent, signer_real_name, signer_id_card, signer_phone)
         VALUES (?, ?, ?, SHA2(?, 256), NOW(), ?, ?, ?, ?, ?)`,
        [
          contractId,
          signerType,
          signatureData,
          signatureData,
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          request.headers.get('user-agent') || 'unknown',
          signerInfo?.realName || null,
          signerInfo?.idCard || null,
          signerInfo?.phone || null
        ]
      );

      // 生成PDF（这里可以调用PDF生成服务）
      // const pdfUrl = await generateContractPDF(contractId);
      
      // 更新PDF URL
      // await connection.execute(
      //   'UPDATE contracts SET pdf_url = ? WHERE id = ?',
      //   [pdfUrl, contractId]
      // );

      // 更新合同内容以显示客户填写的信息
      await updateContractContentWithSignature(contractId, signerInfo);

      // 提交事务
      await connection.commit();

      return NextResponse.json({
        success: true,
        message: '合同签署成功',
        contractId: contractId
      });

    } catch (error) {
      // 回滚事务
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('签署合同失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '签署合同时发生错误' 
      },
      { status: 500 }
    );
  }
}