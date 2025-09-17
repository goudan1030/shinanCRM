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
    const { signatureData, signerType, signerInfo } = body;

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

    // 如果是客户签署，验证签署者信息
    if (signerType === 'CUSTOMER' && (!signerInfo || !signerInfo.realName || !signerInfo.idCard || !signerInfo.phone)) {
      return NextResponse.json(
        { error: '客户签署需要提供完整的签署者信息' },
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
        ip_address, user_agent, signer_real_name, signer_id_card, signer_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contractId, 
        signerType, 
        signatureData, 
        signatureHash, 
        ipAddress, 
        userAgent,
        signerInfo?.realName || null,
        signerInfo?.idCard || null,
        signerInfo?.phone || null
      ]
    );

    // 更新合同状态为已签署，同时更新合同内容中的签署日期
    const signedDate = new Date().toLocaleDateString('zh-CN');
    
    // 获取当前合同内容并更新签署日期
    const [contractUpdateRows] = await executeQuery(
      'SELECT content, variables FROM contracts WHERE id = ?',
      [contractId]
    );
    
    if (contractUpdateRows && (contractUpdateRows as any[]).length > 0) {
      const currentContract = (contractUpdateRows as any[])[0];
      let updatedContent = currentContract.content;
      
      // 安全处理variables字段，可能是字符串或对象
      let variables: any = {};
      try {
        if (typeof currentContract.variables === 'string') {
          variables = JSON.parse(currentContract.variables || '{}');
        } else if (typeof currentContract.variables === 'object' && currentContract.variables !== null) {
          variables = currentContract.variables;
        } else {
          variables = {};
        }
      } catch (error) {
        console.error('解析variables失败，使用默认值:', error);
        variables = {};
      }
      
      // 更新变量中的签署日期
      variables.signDate = signedDate;
      
      // 更新合同内容中的签署日期占位符
      updatedContent = updatedContent.replace(/日期：_____________/g, `日期：${signedDate}`);
      updatedContent = updatedContent.replace(/{{signDate}}/g, signedDate);
      // 更新合同头部的签署日期
      updatedContent = updatedContent.replace(/签署日期：\s*<\/p>/g, `签署日期：${signedDate}</p>`);
      
      // 更新乙方信息占位符
      if (signerInfo) {
        // 替换姓名占位符
        updatedContent = updatedContent.replace(/姓名：\s*明天/g, `姓名：${signerInfo.realName}`);
        updatedContent = updatedContent.replace(/待客户填写/g, signerInfo.realName);
        
        // 替换身份证号占位符
        updatedContent = updatedContent.replace(/身份证号：\s*待客户填写/g, `身份证号：${signerInfo.idCard}`);
        
        // 替换手机号占位符 
        updatedContent = updatedContent.replace(/联系电话：\s*13157118301/g, `联系电话：${signerInfo.phone}`);
        
        // 替换联系地址占位符
        updatedContent = updatedContent.replace(/联系地址：\s*待客户填写/g, `联系地址：${signerInfo.realName}提供`);
      }
      
      // 将签名图片插入到合同的乙方签署区域
      const signatureImageTag = `<img src="${signatureData}" alt="乙方签名" style="max-width: 150px; max-height: 80px; margin: 10px 0;">`;
      updatedContent = updatedContent.replace(
        /<div class="signature-line"><\/div>/g, 
        signatureImageTag
      );
      
      // 兼容其他可能的签名区域格式
      updatedContent = updatedContent.replace(
        /乙方（签名）：\s*<div class="signature-line"><\/div>/g,
        `乙方（签名）：\n${signatureImageTag}`
      );
      
      // 更新数据库
      await executeQuery(
        'UPDATE contracts SET status = ?, signed_at = NOW(), updated_at = NOW(), content = ?, variables = ? WHERE id = ?',
        ['SIGNED', updatedContent, JSON.stringify(variables), contractId]
      );
    } else {
      // 如果无法获取合同内容，至少更新状态
      await executeQuery(
        'UPDATE contracts SET status = ?, signed_at = NOW(), updated_at = NOW() WHERE id = ?',
        ['SIGNED', contractId]
      );
    }

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
