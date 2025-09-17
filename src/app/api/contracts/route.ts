import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { ContractListParams, ContractListResponse, GenerateContractRequest, GenerateContractResponse } from '@/types/contract';
import { v4 as uuidv4 } from 'uuid';

// 获取合同列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const contractType = searchParams.get('contractType');
    const memberId = searchParams.get('memberId');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let queryParams: any[] = [];

    if (status && status !== 'all') {
      whereConditions.push('c.status = ?');
      queryParams.push(status);
    }

    if (contractType && contractType !== 'all') {
      whereConditions.push('c.contract_type = ?');
      queryParams.push(contractType);
    }

    if (memberId) {
      whereConditions.push('c.member_id = ?');
      queryParams.push(parseInt(memberId));
    }

    if (search) {
      whereConditions.push('(c.contract_number LIKE ? OR m.name LIKE ? OR m.member_no LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 获取合同列表
    const contractsQuery = `
      SELECT 
        c.*,
        m.member_no,
        m.name as member_name,
        m.phone as member_phone,
        m.id_card as member_id_card,
        ct.name as template_name
      FROM contracts c
      LEFT JOIN members m ON c.member_id = m.id
      LEFT JOIN contract_templates ct ON c.template_id = ct.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);
    const [contracts] = await executeQuery(contractsQuery, queryParams);

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM contracts c
      LEFT JOIN members m ON c.member_id = m.id
      ${whereClause}
    `;
    
    const countParams = queryParams.slice(0, -2); // 移除 limit 和 offset
    const [countResult] = await executeQuery(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    const response: ContractListResponse = {
      contracts: contracts as any[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('获取合同列表失败:', error);
    return NextResponse.json(
      { error: '获取合同列表失败' },
      { status: 500 }
    );
  }
}

// 生成新合同
export async function POST(request: NextRequest) {
  try {
    const body: GenerateContractRequest = await request.json();
    const { memberId, contractType, templateId, variables = {} } = body;

    // 验证必需参数
    if (!memberId || !contractType) {
      return NextResponse.json(
        { error: '缺少必需参数' },
        { status: 400 }
      );
    }

    // 获取会员信息
    const [memberRows] = await executeQuery(
      'SELECT id, member_no, name, phone, id_card FROM members WHERE id = ?',
      [memberId]
    );

    if (!memberRows || memberRows.length === 0) {
      return NextResponse.json(
        { error: '会员不存在' },
        { status: 404 }
      );
    }

    const member = memberRows[0];

    // 获取合同模板
    let templateIdToUse = templateId;
    if (!templateIdToUse) {
      const [templateRows] = await executeQuery(
        'SELECT id FROM contract_templates WHERE type = ? AND is_active = TRUE ORDER BY id ASC LIMIT 1',
        [contractType]
      );
      
      if (!templateRows || templateRows.length === 0) {
        return NextResponse.json(
          { error: '未找到对应的合同模板' },
          { status: 404 }
        );
      }
      
      templateIdToUse = templateRows[0].id;
    }

    const [templateRows] = await executeQuery(
      'SELECT * FROM contract_templates WHERE id = ?',
      [templateIdToUse]
    );

    if (!templateRows || templateRows.length === 0) {
      return NextResponse.json(
        { error: '合同模板不存在' },
        { status: 404 }
      );
    }

    const template = templateRows[0];

    // 生成合同编号
    const contractNumber = `CT${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // 准备合同变量
    const contractVariables = {
      contractTitle: template.name,
      contractNumber,
      signDate: new Date().toLocaleDateString('zh-CN'),
      companyName: '心婚科技有限公司',
      customerName: member.name,
      customerIdCard: member.id_card,
      customerPhone: member.phone,
      serviceType: contractType === 'MEMBERSHIP' ? '会员服务' : 
                   contractType === 'ONE_TIME' ? '一次性服务' : '年费服务',
      serviceDuration: contractType === 'MEMBERSHIP' ? '1年' : 
                      contractType === 'ONE_TIME' ? '3个月' : '1年',
      serviceFee: contractType === 'MEMBERSHIP' ? '299' : 
                  contractType === 'ONE_TIME' ? '99' : '999',
      ...variables
    };

    // 渲染合同内容
    let contractContent = template.template_content;
    Object.entries(contractVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      contractContent = contractContent.replace(regex, String(value));
    });

    // 设置过期时间（7天）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 创建合同记录
    const [result] = await executeQuery(
      `INSERT INTO contracts (
        contract_number, member_id, contract_type, template_id, 
        status, content, variables, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contractNumber,
        memberId,
        contractType,
        templateIdToUse,
        'PENDING',
        contractContent,
        JSON.stringify(contractVariables),
        expiresAt
      ]
    );

    const contractId = (result as any).insertId;

    // 生成签署链接
    const signUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/contracts/sign/${contractId}`;

    const response: GenerateContractResponse = {
      contractId,
      contractNumber,
      signUrl,
      expiresAt: expiresAt.toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('生成合同失败:', error);
    return NextResponse.json(
      { error: '生成合同失败' },
      { status: 500 }
    );
  }
}
