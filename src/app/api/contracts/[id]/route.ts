import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { Contract } from '@/types/contract';

// 获取单个合同详情
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

    const [rows] = await executeQuery(
      `SELECT 
        c.*,
        m.member_no,
        m.nickname as member_name,
        m.real_name as member_real_name,
        m.phone as member_phone,
        m.id_card as member_id_card,
        ct.name as template_name,
        cs.signer_real_name,
        cs.signer_id_card,
        cs.signer_phone
      FROM contracts c
      LEFT JOIN members m ON c.member_id = m.id
      LEFT JOIN contract_templates ct ON c.template_id = ct.id
      LEFT JOIN contract_signatures cs ON c.id = cs.contract_id AND cs.signer_type = 'CUSTOMER'
      WHERE c.id = ?`,
      [contractId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: '合同不存在' },
        { status: 404 }
      );
    }

    const rawContract = rows[0] as any;
    
    // 构造正确的合同对象结构
    const contract: Contract = {
      id: rawContract.id,
      contract_number: rawContract.contract_number,
      member_id: rawContract.member_id,
      template_id: rawContract.template_id,
      contract_type: rawContract.contract_type,
      content: rawContract.content,
      variables: rawContract.variables,
      status: rawContract.status,
      created_at: rawContract.created_at,
      updated_at: rawContract.updated_at,
      signed_at: rawContract.signed_at,
      expires_at: rawContract.expires_at,
      pdf_url: rawContract.pdf_url,
      signature_data: rawContract.signature_data,
      signature_hash: rawContract.signature_hash,
      // 构造member对象，优先使用签署记录中的真实信息
      member: rawContract.member_no ? {
        id: rawContract.member_id,
        member_no: rawContract.member_no,
        name: rawContract.signer_real_name || rawContract.member_name,
        member_name: rawContract.member_name,
        member_real_name: rawContract.signer_real_name || rawContract.member_real_name,
        phone: rawContract.signer_phone || rawContract.member_phone,
        member_phone: rawContract.signer_phone || rawContract.member_phone,
        member_id_card: rawContract.signer_id_card || rawContract.member_id_card
      } : undefined,
      // 构造template对象
      template: rawContract.template_name ? {
        name: rawContract.template_name
      } : undefined
    };

    return NextResponse.json(contract);
  } catch (error) {
    console.error('获取合同详情失败:', error);
    return NextResponse.json(
      { error: '获取合同详情失败' },
      { status: 500 }
    );
  }
}

// 更新合同状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contractId = parseInt(id);
    const body = await request.json();
    const { status, pdfUrl } = body;

    if (isNaN(contractId)) {
      return NextResponse.json(
        { error: '无效的合同ID' },
        { status: 400 }
      );
    }

    // 验证合同是否存在
    const [existingRows] = await executeQuery(
      'SELECT id FROM contracts WHERE id = ?',
      [contractId]
    );

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { error: '合同不存在' },
        { status: 404 }
      );
    }

    // 更新合同
    const updateFields = [];
    const updateValues = [];

    if (status) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (pdfUrl) {
      updateFields.push('pdf_url = ?');
      updateValues.push(pdfUrl);
    }

    if (status === 'SIGNED') {
      updateFields.push('signed_at = NOW()');
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: '没有需要更新的字段' },
        { status: 400 }
      );
    }

    updateValues.push(contractId);

    await executeQuery(
      `UPDATE contracts SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新合同失败:', error);
    return NextResponse.json(
      { error: '更新合同失败' },
      { status: 500 }
    );
  }
}

// 删除合同
export async function DELETE(
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

    // 检查合同是否存在
    const [rows] = await executeQuery(
      'SELECT id, status FROM contracts WHERE id = ?',
      [contractId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: '合同不存在' },
        { status: 404 }
      );
    }

    // 开始事务删除合同及相关数据
    try {
      // 1. 删除合同签署记录
      await executeQuery('DELETE FROM contract_signatures WHERE contract_id = ?', [contractId]);
      
      // 2. 删除合同记录
      await executeQuery('DELETE FROM contracts WHERE id = ?', [contractId]);
      
      console.log(`成功删除合同 ${contractId} 及其相关签署信息`);
    } catch (deleteError) {
      console.error('删除合同相关数据失败:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除合同失败:', error);
    return NextResponse.json(
      { error: '删除合同失败' },
      { status: 500 }
    );
  }
}
