import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { ContractListResponse, GenerateContractRequest, GenerateContractResponse } from '@/types/contract';

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
      whereConditions.push('(c.contract_number LIKE ? OR m.nickname LIKE ? OR m.member_no LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 获取合同列表
    const contractsQuery = `
      SELECT 
        c.*,
        m.member_no,
        m.nickname as member_name,
        m.phone as member_phone,
        m.wechat as member_wechat,
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
    const total = (countResult as any[])[0]?.total || 0;

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

    // 获取会员信息 - 尝试获取真实姓名和身份证号，如果不存在则使用默认字段
    const [memberRows] = await executeQuery(
      'SELECT id, member_no, nickname, phone, wechat, real_name, id_card FROM members WHERE id = ?',
      [memberId]
    );

    if (!memberRows || (memberRows as any[]).length === 0) {
      return NextResponse.json(
        { error: '会员不存在' },
        { status: 404 }
      );
    }

    const member = (memberRows as any[])[0];
    console.log('👤 会员信息:', member);

    // 获取合同模板
    let templateIdToUse = templateId;
    if (!templateIdToUse) {
      const [templateRows] = await executeQuery(
        'SELECT id FROM contract_templates WHERE type = ? AND is_active = TRUE ORDER BY id ASC LIMIT 1',
        [contractType]
      );
      
      if (!templateRows || (templateRows as any[]).length === 0) {
        return NextResponse.json(
          { error: '未找到对应的合同模板' },
          { status: 404 }
        );
      }
      
      templateIdToUse = (templateRows as any[])[0].id;
    }

    const [templateRows] = await executeQuery(
      'SELECT * FROM contract_templates WHERE id = ?',
      [templateIdToUse]
    );

    if (!templateRows || (templateRows as any[]).length === 0) {
      return NextResponse.json(
        { error: '合同模板不存在' },
        { status: 404 }
      );
    }

    const template = (templateRows as any[])[0];
    console.log('📋 模板信息:', { id: template.id, name: template.name, type: template.type });

    // 生成合同编号
    const contractNumber = `CT${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // 准备合同变量
    const contractVariables = {
      // 合同基本信息
      contractTitle: template.name,
      contractNumber,
      signDate: '', // 乙方签署日期，待签署时填写
      contractGenerateDate: new Date().toLocaleDateString('zh-CN'), // 合同生成日期（甲方盖章日期）
      
      // 甲方信息（公司信息） - 使用正确的公司信息
      companyName: '杭州石楠文化科技有限公司',
      companyTaxId: '91330105MA2KCLP6X2',
      companyAddress: '浙江省杭州市拱墅区',
      
      // 乙方信息（客户信息）
      customerName: member.real_name || member.nickname || '待用户填写',
      customerIdCard: member.id_card || '待用户填写',
      customerPhone: member.phone || '待填写',
      customerAddress: '待用户填写',
      
      // 服务信息 - 支持自定义变量覆盖
      serviceType: variables.serviceType || (contractType === 'MEMBERSHIP' ? '会员服务' : 
                   contractType === 'ONE_TIME' ? '一次性服务' : '年费服务'),
      serviceDuration: variables.serviceDuration || (contractType === 'MEMBERSHIP' ? '1年' : 
                      contractType === 'ONE_TIME' ? '3个月' : '1年'),
      serviceFee: variables.serviceFee || (contractType === 'MEMBERSHIP' ? '299' : 
                  contractType === 'ONE_TIME' ? '99' : '999'),
      
      // 其他自定义变量
      ...variables
    };

    // 渲染合同内容
    let contractContent = template.template_content;
    
    // 调试日志：输出变量信息
    console.log('🔍 合同变量:', JSON.stringify(contractVariables, null, 2));
    console.log('📄 原始模板长度:', template.template_content.length);
    
    // 替换所有变量 - 使用更强健的替换方法
    Object.entries(contractVariables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const valueStr = String(value || '');
      
      // 检查是否存在该占位符
      if (contractContent.includes(placeholder)) {
        console.log(`✅ 替换变量 ${placeholder} -> "${valueStr}"`);
        contractContent = contractContent.split(placeholder).join(valueStr);
      } else {
        console.log(`⚠️ 未找到占位符: ${placeholder}`);
      }
    });
    
    // 检查是否还有未替换的变量
    const remainingVariables = contractContent.match(/{{[^}]+}}/g);
    if (remainingVariables) {
      console.log('⚠️ 未替换的变量:', remainingVariables);
    }
    
    console.log('📄 处理后合同长度:', contractContent.length);

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
    console.log('✅ 合同创建成功, ID:', contractId, '编号:', contractNumber);

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
