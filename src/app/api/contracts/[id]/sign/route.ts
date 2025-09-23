import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

// 更新合同内容以显示客户填写的信息和签名
async function updateContractContentWithSignature(contractId: number, signerInfo: any, signatureData: string) {
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

    console.log('开始更新合同内容，签署人信息:', signerInfo);

    // 1. 替换合同顶部的甲方信息
    if (signerInfo?.realName) {
      content = content.replace(
        /<p>甲方：.*?<\/p>/,
        `<p>甲方：${signerInfo.realName}</p>`
      );
      console.log('✅ 已更新合同顶部甲方信息');
    }

    // 2. 替换签署区域的甲方信息
    if (signerInfo?.realName) {
      // 替换甲方签字信息
      content = content.replace(
        /<p><strong>甲方（签字）：<\/strong><\/p>\s*<p>身份证号：待客户填写<\/p>\s*<p>联系电话：待客户填写<\/p>/,
        `<p><strong>甲方（签字）：</strong> ${signerInfo.realName}</p>
         <p>身份证号：${signerInfo.idCard || '待客户填写'}</p>
         <p>联系电话：${signerInfo.phone || '待客户填写'}</p>`
      );
      console.log('✅ 已更新签署区域甲方信息');
    }

    // 3. 添加用户签名图片
    if (signatureData) {
      // 在甲方签字信息后添加签名图片
      const signatureHtml = `
        <div style="margin-top: 10px; text-align: left;">
          <img src="${signatureData}" alt="甲方签名" style="max-width: 200px; max-height: 100px; background: transparent;" />
        </div>`;
      
      content = content.replace(
        /(<p>联系电话：.*?<\/p>)(\s*<\/div>)/,
        `$1${signatureHtml}$2`
      );
      console.log('✅ 已添加用户签名图片');
    }

    // 4. 修复图片路径问题 - 将相对路径改为绝对路径
    content = content.replace(
      /src="\/alipay\.png"/g,
      'src="/alipay.png" style="max-width: 200px; height: auto;"'
    );
    
    // 修复乙方公章样式 - 覆盖在文字上并添加旋转
    content = content.replace(
      /src="\/zhang\.png"/g,
      'src="/zhang.png" style="position: absolute; width: 100px; height: 100px; top: -10px; right: 20px; z-index: 2; opacity: 0.9; transform: rotate(-15deg);"'
    );

    // 更新合同内容
    await executeQuery(
      'UPDATE contracts SET content = ?, updated_at = NOW() WHERE id = ?',
      [content, contractId]
    );

    console.log('✅ 合同内容已更新，显示客户填写的信息和签名');
  } catch (error) {
    console.error('更新合同内容失败:', error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contractId = parseInt(id);
    const body = await request.json();
    const { signatureData, signerType, signerInfo } = body;

    if (!signatureData) {
      return NextResponse.json(
        { success: false, message: '签名数据不能为空' },
        { status: 400 }
      );
    }

    // 使用executeQuery而不是直接连接，避免事务锁问题
    try {
      console.log('开始签署合同:', contractId, '签署人信息:', signerInfo);
      
      // 首先检查合同状态
      const [contractRows] = await executeQuery(
        'SELECT status FROM contracts WHERE id = ?',
        [contractId]
      );
      
      console.log('合同状态查询结果:', contractRows);

      if (!contractRows || (contractRows as any[]).length === 0) {
        return NextResponse.json(
          { success: false, message: '合同不存在' },
          { status: 404 }
        );
      }

      const contract = (contractRows as any[])[0];
      if (contract.status === 'SIGNED') {
        return NextResponse.json(
          { success: false, message: '合同已经签署过了' },
          { status: 400 }
        );
      }

      // 更新合同状态为已签署
      console.log('开始更新合同状态...');
      const updateResult = await executeQuery(
        `UPDATE contracts 
         SET status = 'SIGNED', 
             signed_at = NOW(),
             signature_data = ?,
             signature_hash = SHA2(?, 256)
         WHERE id = ? AND status = 'PENDING'`,
        [JSON.stringify({ signatureData, signerType, signerInfo }), signatureData, contractId]
      );

      console.log('合同状态更新结果:', updateResult);

      // 检查更新是否成功
      if ((updateResult as any).affectedRows === 0) {
        console.log('合同状态更新失败，affectedRows为0');
        return NextResponse.json(
          { success: false, message: '合同状态更新失败，可能已被其他操作修改' },
          { status: 400 }
        );
      }

      // 插入签署记录
      console.log('开始插入签署记录...');
      const insertResult = await executeQuery(
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
      console.log('签署记录插入结果:', insertResult);

      // 更新合同内容以显示客户填写的信息和签名
      await updateContractContentWithSignature(contractId, signerInfo, signatureData);

      console.log('✅ 合同签署成功:', contractId);
      return NextResponse.json({
        success: true,
        message: '合同签署成功',
        contractId: contractId
      });

    } catch (error) {
      console.error('签署合同数据库操作失败:', error);
      return NextResponse.json(
        { 
          success: false, 
          message: '签署失败: ' + (error instanceof Error ? error.message : '未知错误')
        },
        { status: 500 }
      );
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