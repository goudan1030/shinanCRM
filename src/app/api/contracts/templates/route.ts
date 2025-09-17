import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { ContractTemplate } from '@/types/contract';

// 获取合同模板列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');

    let whereConditions = [];
    let queryParams: any[] = [];

    if (type) {
      whereConditions.push('type = ?');
      queryParams.push(type);
    }

    if (isActive !== null) {
      whereConditions.push('is_active = ?');
      queryParams.push(isActive === 'true');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [templates] = await executeQuery(
      `SELECT * FROM contract_templates ${whereClause} ORDER BY created_at DESC`,
      queryParams
    );

    return NextResponse.json(templates as ContractTemplate[]);
  } catch (error) {
    console.error('获取合同模板失败:', error);
    return NextResponse.json(
      { error: '获取合同模板失败' },
      { status: 500 }
    );
  }
}

// 创建合同模板
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, template_content, variables_schema, is_active = true } = body;

    // 验证必需参数
    if (!name || !type || !template_content) {
      return NextResponse.json(
        { error: '缺少必需参数' },
        { status: 400 }
      );
    }

    // 创建模板
    const [result] = await executeQuery(
      `INSERT INTO contract_templates (
        name, type, template_content, variables_schema, is_active
      ) VALUES (?, ?, ?, ?, ?)`,
      [name, type, template_content, JSON.stringify(variables_schema || {}), is_active]
    );

    const templateId = (result as any).insertId;

    return NextResponse.json({ 
      success: true, 
      templateId,
      message: '合同模板创建成功'
    });
  } catch (error) {
    console.error('创建合同模板失败:', error);
    return NextResponse.json(
      { error: '创建合同模板失败' },
      { status: 500 }
    );
  }
}
