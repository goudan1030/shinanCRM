import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';

// 撤销合同签署
export async function POST(
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

    // 检查合同是否存在且已签署
    const [contractRows] = await executeQuery(
      'SELECT id, status, contract_number FROM contracts WHERE id = ?',
      [contractId]
    );

    if (!contractRows || (contractRows as any[]).length === 0) {
      return NextResponse.json(
        { error: '合同不存在' },
        { status: 404 }
      );
    }

    const contract = (contractRows as any[])[0];
    if (contract.status !== 'SIGNED') {
      return NextResponse.json(
        { error: '只有已签署的合同才能撤销签署' },
        { status: 400 }
      );
    }

    // 开始撤销签署操作
    try {
      // 1. 删除签署记录
      await executeQuery(
        'DELETE FROM contract_signatures WHERE contract_id = ?',
        [contractId]
      );

      // 2. 更新合同状态和清除签署相关数据
      await executeQuery(
        `UPDATE contracts 
         SET status = 'PENDING', 
             signed_at = NULL, 
             signature_data = NULL, 
             signature_hash = NULL,
             updated_at = NOW()
         WHERE id = ?`,
        [contractId]
      );

      // 3. 恢复合同内容中的占位符（移除签名图片，恢复签名线）
      const [contentRows] = await executeQuery(
        'SELECT content FROM contracts WHERE id = ?',
        [contractId]
      );

      if (contentRows && (contentRows as any[]).length > 0) {
        let content = (contentRows as any[])[0].content;
        
        // 移除签名图片，恢复签名线
        content = content.replace(/<img[^>]*alt="乙方签名"[^>]*>/g, '<div class="signature-line"></div>');
        
        // 恢复日期占位符
        content = content.replace(/日期：\d{4}\/\d{1,2}\/\d{1,2}/g, '日期：_____________');
        
        // 更新合同内容
        await executeQuery(
          'UPDATE contracts SET content = ? WHERE id = ?',
          [content, contractId]
        );
      }

      console.log(`成功撤销合同 ${contract.contract_number} 的签署状态`);

      return NextResponse.json({ 
        success: true, 
        message: '签署已撤销，合同状态已恢复为待签署' 
      });

    } catch (revokeError) {
      console.error('撤销签署操作失败:', revokeError);
      throw revokeError;
    }

  } catch (error) {
    console.error('撤销合同签署失败:', error);
    return NextResponse.json(
      { error: '撤销签署失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
