import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { Contract } from '@/types/contract';

// 获取单个合同详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = parseInt(params.id);

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
        m.name as member_name,
        m.phone as member_phone,
        m.id_card as member_id_card,
        ct.name as template_name
      FROM contracts c
      LEFT JOIN members m ON c.member_id = m.id
      LEFT JOIN contract_templates ct ON c.template_id = ct.id
      WHERE c.id = ?`,
      [contractId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: '合同不存在' },
        { status: 404 }
      );
    }

    const contract = rows[0] as Contract;

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
  { params }: { params: { id: string } }
) {
  try {
    const contractId = parseInt(params.id);
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
  { params }: { params: { id: string } }
) {
  try {
    const contractId = parseInt(params.id);

    if (isNaN(contractId)) {
      return NextResponse.json(
        { error: '无效的合同ID' },
        { status: 400 }
      );
    }

    // 检查合同状态，只有草稿状态的合同才能删除
    const [rows] = await executeQuery(
      'SELECT status FROM contracts WHERE id = ?',
      [contractId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: '合同不存在' },
        { status: 404 }
      );
    }

    const contract = rows[0];
    if (contract.status !== 'DRAFT') {
      return NextResponse.json(
        { error: '只有草稿状态的合同才能删除' },
        { status: 400 }
      );
    }

    // 删除合同
    await executeQuery('DELETE FROM contracts WHERE id = ?', [contractId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除合同失败:', error);
    return NextResponse.json(
      { error: '删除合同失败' },
      { status: 500 }
    );
  }
}
