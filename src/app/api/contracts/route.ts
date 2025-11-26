import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { ContractListResponse, GenerateContractRequest, GenerateContractResponse } from '@/types/contract';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/contracts');

// 更新印章样式为叠加效果
function updateSealOverlayStyle(content: string): string {
  // 更新CSS样式
  const oldSealStyle = `.seal-container { text-align: center; flex: 1; }
        .company-seal { width: 120px; height: 120px; margin: 10px auto; display: block; }`;
  
  const newSealStyle = `.seal-container { 
            text-align: left; 
            flex: 1; 
            position: relative;
            line-height: 1.8;
        }
        .company-seal { 
            position: absolute;
            width: 100px; 
            height: 100px; 
            top: -10px;
            right: 20px;
            z-index: 2;
            opacity: 0.9;
        }`;

  // 替换CSS样式
  content = content.replace(oldSealStyle, newSealStyle);

  // 更新HTML结构，在甲方信息中添加公司名称
  const oldSealHTML = `<div class="seal-container">
            <p><strong>甲方（盖章）：</strong></p>
            <img src="/zhang.png" alt="公司印章" class="company-seal">
            <p>日期：`;
  
  const newSealHTML = `<div class="seal-container">
            <p><strong>甲方（盖章）：</strong></p>
            <p>杭州石楠文化科技有限公司</p>
            <img src="/zhang.png" alt="公司印章" class="company-seal">
            <p>日期：`;

  content = content.replace(oldSealHTML, newSealHTML);

  return content;
}

// 获取合同列表
export async function GET(request: NextRequest) {
  try {
    logger.debug('开始处理合同列表请求');
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const contractType = searchParams.get('contractType');
    const memberId = searchParams.get('memberId');
    const search = searchParams.get('search');

    logger.debug('请求参数', { page, limit, status, contractType, memberId, search });

    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let queryParams: (string | number)[] = [];

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
    logger.debug('执行合同列表查询', { query: contractsQuery, params: queryParams });
    
    let contracts: any[] = [];
    try {
      const result = await executeQuery(contractsQuery, queryParams);
      contracts = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : (Array.isArray(result) ? result : []);
      logger.debug('合同列表查询结果', { count: contracts.length, resultType: Array.isArray(result) ? 'array' : typeof result });
    } catch (queryError) {
      logger.error('合同列表查询失败', queryError instanceof Error ? queryError : new Error(String(queryError)));
      throw queryError;
    }

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM contracts c
      LEFT JOIN members m ON c.member_id = m.id
      ${whereClause}
    `;
    
    const countParams = queryParams.slice(0, -2); // 移除 limit 和 offset
    logger.debug('执行总数查询', { query: countQuery, params: countParams });
    
    let total = 0;
    try {
      const countResult = await executeQuery(countQuery, countParams);
      logger.debug('总数查询结果', { countResult, resultType: Array.isArray(countResult) ? 'array' : typeof countResult });
      
      // 处理不同的返回格式
      if (Array.isArray(countResult)) {
        if (Array.isArray(countResult[0])) {
          // 格式: [[{total: 10}]]
          const firstRow = countResult[0][0];
          total = firstRow && typeof firstRow === 'object' && 'total' in firstRow
            ? Number(firstRow.total) || 0
            : 0;
        } else if (countResult[0] && typeof countResult[0] === 'object' && 'total' in countResult[0]) {
          // 格式: [{total: 10}]
          total = Number(countResult[0].total) || 0;
        } else {
          // 格式: [10] 或其他
          total = Number(countResult[0]) || 0;
        }
      } else if (countResult && typeof countResult === 'object' && 'total' in countResult) {
        total = Number(countResult.total) || 0;
      }
    } catch (countError) {
      logger.error('总数查询失败', countError instanceof Error ? countError : new Error(String(countError)));
      // 如果总数查询失败，使用合同列表的长度作为总数
      total = contracts.length;
    }

    logger.debug('解析总数', { total });

    // 格式化合同数据，将平铺的会员字段转换为嵌套结构
    interface ContractRow {
      id: number;
      contract_number: string;
      member_id: number;
      member_no?: string;
      member_name?: string;
      member_phone?: string;
      member_wechat?: string;
      template_name?: string;
      [key: string]: unknown;
    }
    const formattedContracts = (Array.isArray(contracts) ? contracts : []).map((contract: ContractRow) => ({
      ...contract,
      member: contract.member_no ? {
        id: contract.member_id,
        member_no: contract.member_no,
        name: contract.member_name,
        phone: contract.member_phone,
        wechat: contract.member_wechat
      } : null,
      template: contract.template_name ? {
        name: contract.template_name
      } : null
    }));

    logger.debug('格式化后的合同数据', { count: formattedContracts.length });

    const response: ContractListResponse = {
      contracts: formattedContracts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };

    logger.info('合同列表获取成功', { total, page, limit });
    return createSuccessResponse(response, '获取合同列表成功');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('获取合同列表失败', error instanceof Error ? error : new Error(String(error)));
    logger.error('错误详情', { errorMessage, errorStack });
    return createErrorResponse(`获取合同列表失败: ${errorMessage}`, 500);
  }
}

// 生成新合同
export async function POST(request: NextRequest) {
  try {
    const body: GenerateContractRequest = await request.json();
    const { memberId, contractType, templateId, variables = {} } = body;

    // 验证必需参数
    if (!memberId || !contractType) {
      return createErrorResponse('缺少必需参数', 400);
    }

    // 获取会员信息 - 尝试获取真实姓名和身份证号，如果不存在则使用默认字段
    const [memberRows] = await executeQuery(
      'SELECT id, member_no, nickname, phone, wechat, real_name, id_card FROM members WHERE id = ?',
      [memberId]
    );

    if (!memberRows || (memberRows as any[]).length === 0) {
      return createErrorResponse('会员不存在', 404);
    }

    interface MemberRow {
      id: number;
      member_no: string;
      nickname?: string;
      [key: string]: unknown;
    }
    const member = memberRows[0] as MemberRow;
    logger.debug('会员信息', { memberId: member.id, memberNo: member.member_no });

    // 使用固定的PDF格式模板
    const template = {
      id: 1,
      name: '石楠文化介绍服务合同',
      type: contractType,
      template_content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{contractTitle}}</title>
    <style>
        body { 
            font-family: "Microsoft YaHei", Arial, sans-serif; 
            line-height: 1.8; 
            margin: 40px; 
            color: #333;
            font-size: 14px;
            background: white;
        }
        .contract-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }
        .contract-header { 
            text-align: center; 
            margin-bottom: 40px; 
        }
        .contract-content { 
            margin: 30px 0; 
        }
        .signature-section { 
            margin-top: 60px; 
        }
        .contract-clause { 
            margin: 30px 0; 
        }
        .contract-number { 
            font-weight: bold; 
        }
        .field-label {
            font-weight: bold;
            color: #333;
        }
        .field-value {
            display: inline-block;
        }
        .party-info { 
            margin: 20px 0; 
        }
        .package-option {
            margin: 20px 0;
        }
        .service-list {
            margin: 15px 0;
        }
        .service-item {
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <div class="contract-header">
            <h1>{{contractTitle}}</h1>
            <p class="contract-number">合同编号：<span class="field-value">{{contractNumber}}</span></p>
            <p>签订日期：<span class="field-value">{{signingDate}}</span></p>
        </div>
        
        <div class="contract-content">
            <p>甲方：{{customerDisplayName}}</p>
            <p>乙方：{{companyName}}</p>
            <p>签订日期：{{signingDate}}</p>
            
            <div class="contract-clause">
                <h3>第一章：前言</h3>
                <p>1.1 乙方是一家提供形婚信息中介服务的平台，运营有"形婚信息"、"形婚互助圈"等服务平台。</p>
                <p>1.2 甲方有意接受乙方提供的形婚信息中介服务。</p>
                <p>1.3 双方根据《中华人民共和国民法典》等相关法律法规，在平等、自愿、公平、诚实信用的基础上，就服务事宜达成如下协议。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第二章：服务内容与费用</h3>
                <p>甲方选择购买乙方提供的以下第 <u>{{selectedPackageLetters}}</u> 项套餐服务：</p>
                
                <div class="package-option">
                    <p><strong>A.☐ 会员套餐-套餐总价：1299元（人民币）</strong></p>
                    <p>本套餐包含以下11项服务，服务有效期自本合同生效之日起12个月：</p>
                    <div class="service-list">
                        <div class="service-item">（1）会员匹配服务：甲方可主动联系乙方平台会员库中的异性会员。原价200元/次。</div>
                        <div class="service-item">（2）个人信息地区汇总：甲方个人信息将默认加入乙方平台的地区汇总列表。原价150元。</div>
                        <div class="service-item">（3）专属会员群：邀请甲方加入仅发布异性信息的专属会员群。原价100元。</div>
                        <div class="service-item">（4）个人信息公众号定期发布：乙方在其微信公众号上定期发布甲方信息。原价50元/次。</div>
                        <div class="service-item">（5）个人信息朋友圈定期推送：乙方在其官方朋友圈定期推送甲方信息。原价50元/次。</div>
                        <div class="service-item">（6）个人信息微博定期推送：乙方在其官方微博定期推送甲方信息。原价50元/次。</div>
                        <div class="service-item">（7）个人信息头条定期推送：乙方在其今日头条账号定期推送甲方信息。原价50元/次。</div>
                        <div class="service-item">（8）个人信息贴吧定期推送：乙方在相关贴吧定期推送甲方信息。原价50元/次。</div>
                        <div class="service-item">（9）个人信息微信视频号推送：乙方在其微信视频号定期推送甲方信息。原价50元/次。</div>
                        <div class="service-item">（10）微信小程序省份置顶（开发中）：小程序上线后，甲方信息将在指定省份定期置顶展示。原价200元。</div>
                        <div class="service-item">（11）网站省份置顶（开发中）：网站上线后，甲方信息将在指定省份定期置顶展示。原价200元。</div>
                    </div>
                </div>
                
                <div class="package-option">
                    <p><strong>B.☐ 次卡套餐 -套餐总价：489元（人民币）</strong></p>
                    <p>本套餐包含3次会员匹配服务。甲方可联系平台异性会员，若对方同意，则互推微信并扣除1次次数；若对方不同意，则不扣除次数。重要提示：次卡套餐不包含任何形式的个人信息曝光推送服务（如公众号、朋友圈等）。原价200元/次。</p>
                </div>
                
                <div class="package-option">
                    <p><strong>C.☐ 增值服务1：Banner广告位-服务费用：300元/月</strong></p>
                    <p>甲方个人信息将在乙方微信公众号每日推送、小程序、网站等平台的banner广告位展示。</p>
                </div>
                
                <div class="package-option">
                    <p><strong>D.☐ 增值服务2：一对一红娘匹配服务-服务费用：16888元（人民币）</strong></p>
                    <p>乙方根据甲方具体形婚需求，全网查找合适的异性信息，并服务至双方约定的成功标准为止。具体标准需另行签订补充协议约定。</p>
                </div>
                
                <!-- 合同金额字段 -->
                <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border: 2px solid #007bff; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0 0 15px 0; color: #007bff; font-size: 18px;">合同总金额</h4>
                    <p style="margin: 0; font-size: 24px; font-weight: bold; color: #dc3545;">
                        <span style="background-color: #fff; padding: 10px 20px; border-radius: 5px; border: 2px solid #dc3545; display: inline-block;">
                            {{contractAmount}}元（人民币）
                        </span>
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
                        大写：{{contractAmountChinese}}
                    </p>
                </div>
            </div>
            
            <div class="contract-clause">
                <h3>第三章：付款方式</h3>
                <p>甲方应于本合同签订之日起1日内，向乙方支付上述全部服务费用。</p>
                <p>乙方收款账户信息：</p>
                <p><img src="/alipay.png" alt="支付宝收款二维码" style="max-width: 200px; height: auto;"></p>
            </div>
            
            <div class="contract-clause">
                <h3>第四章：双方权利与义务</h3>
                <p>1.甲方应提供真实、准确、完整的个人资料。</p>
                <p>2.甲方不得将乙方提供的任何会员信息私自分享、泄露给第三方，一经发现，乙方有权立即终止服务且不予退款，并保留追究法律责任的权利。</p>
                <p>3.甲方应遵守乙方平台的各项规则。</p>
                <p>4.乙方应按照本合同约定的服务内容和标准向甲方提供服务。</p>
                <p>5.乙方对甲方的个人信息负有保密义务，但法律法规另有规定或为提供服务所必需的除外。</p>
                <p>6.乙方服务时间为工作日8:30-19:30，周末及节假日休息。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第五章：退款说明（重要条款）</h3>
                <p>甲方在此充分知悉并同意以下退款规则：</p>
                <p>1.无特殊原因，不退款原则：鉴于本服务的特殊性与即时性（信息一经发布或匹配服务一经启动即无法收回），甲方付款后，如无特殊原因，乙方概不退还任何费用。</p>
                <p>2.特殊原因退款规则：如因不可抗力或乙方原因导致服务无法继续，甲方申请退款，需向乙方提出书面申请。退款金额计算方式为：套餐总价-(已享受服务的原价之和)-(套餐总价 × 20%)=可退金额。</p>
                <p>"已享受服务的原价之和"指甲方已使用的各项服务按其单项原价计算的总和。</p>
                <p>扣除套餐总价的20%作为违约金及服务管理成本。</p>
                <p>次卡及单次服务：次卡套餐次数未使用完毕可按上述第2条规则申请退款。单次联系服务一旦购买，费用不予退还。</p>
                <p>因甲方违规的退款若甲方违反本合同第四章第2条之规定，乙方有权立即终止服务，已收取的费用不予退还。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第六条 免责声明</h3>
                <p>乙方仅提供信息中介服务，不对甲方与任何第三方会员沟通、交往的结果作任何保证。甲方应自行判断并承担由此产生的一切风险和责任。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第七条 争议解决</h3>
                <p>本合同履行过程中发生的争议，双方应友好协商解决；协商不成的，任何一方均可向乙方所在地人民法院提起诉讼。</p>
            </div>
            
            <div class="contract-clause">
                <h3>第八条 其他约定</h3>
                <p>本合同一式两份，甲乙双方各执一份，具有同等法律效力，自双方签字、盖章之日生效。</p>
                <p>本合同未尽事宜，可由双方另行签订补充协议。</p>
                <p>乙方保留对本合同所涉及服务的最终解释权。</p>
            </div>
            
            <!-- 补充信息显示区域 -->
            <div class="contract-clause">
                <h3>补充说明</h3>
                {{supplementaryInfoSection}}
            </div>
            
            <div class="signature-section" style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 60px;">
                <div style="text-align: left; flex: 1;">
                    <p><strong>甲方（签字）：</strong></p>
                    <p>身份证号：待客户填写</p>
                    <p>联系电话：待客户填写</p>
                </div>
                <div style="text-align: right; flex: 1; position: relative;">
                    <p><strong>乙方（盖章）：</strong></p>
                    <p>杭州石楠文化科技有限公司</p>
                    <img src="/zhang.png" alt="公司印章" style="position: absolute; width: 100px; height: 100px; top: -10px; right: 20px; z-index: 2; opacity: 0.9; transform: rotate(-15deg);">
                    <p>盖章日期：{{signingDate}}</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`
    };
    
    logger.debug('使用固定PDF模板', { templateId: template.id, templateName: template.name });

    // 生成合同编号
    const contractNumber = `CT${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // 解析选中的套餐
    interface PackageItem {
      id: string;
      letter: string;
      price: number;
      [key: string]: unknown;
    }
    const selectedPackages: PackageItem[] = variables.selected_packages 
      ? (JSON.parse(String(variables.selected_packages)) as PackageItem[])
      : [];
    logger.debug('选中的套餐', { selectedPackages });
    
    // 生成选中的套餐字母
    const selectedPackageLetters = selectedPackages.map((pkg) => pkg.letter).join('、');

    // 数字转人民币大写汉字函数
    const numberToChinese = (num: number): string => {
      const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
      const units = ['', '拾', '佰', '仟', '万', '拾', '佰', '仟', '亿'];
      
      if (num === 0) return '零';
      if (num < 0) return '负' + numberToChinese(-num);
      
      let result = '';
      let unitIndex = 0;
      
      while (num > 0) {
        const digit = num % 10;
        if (digit !== 0) {
          result = digits[digit] + units[unitIndex] + result;
        } else if (result && !result.startsWith('零')) {
          result = '零' + result;
        }
        num = Math.floor(num / 10);
        unitIndex++;
      }
      
      return result;
    };

    // 计算合同总金额
    const totalAmount = selectedPackages.reduce((sum: number, pkg) => sum + (typeof pkg.price === 'number' ? pkg.price : 0), 0);
    const contractAmount = variables.contract_amount || totalAmount.toString();
    const contractAmountChinese = numberToChinese(parseInt(contractAmount)) + '元';

    // 处理补充信息
    const supplementaryInfo = variables.supplementary_info || '';
    const supplementaryInfoSection = supplementaryInfo.trim() 
      ? `<div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9;">
           <p style="margin: 0; font-weight: bold; text-decoration: underline; font-family: 'Microsoft YaHei', Arial, sans-serif;">
             ${supplementaryInfo}
           </p>
         </div>`
      : `<div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; text-align: center;">
           <p style="margin: 0; color: #666; font-style: italic;">
             <span style="border-bottom: 1px solid #ccc; padding-bottom: 2px;">暂无补充内容</span>
           </p>
         </div>`;

    // 准备合同变量
    const contractVariables = {
      // 合同基本信息
      contractTitle: template.name,
      contractNumber,
      signingDate: new Date().toLocaleDateString('zh-CN'), // 签订日期
      
      // 甲方信息（客户信息）
      customerName: member.real_name || '待客户填写',
      customerDisplayName: member.real_name && member.real_name.trim() !== '' ? 
        `${member.real_name}（${member.member_no}）` : 
        '待客户填写',
      customerIdCard: (member as any)?.id_card || '待客户填写',
      customerPhone: member.phone || '待客户填写',
      customerAddress: '待客户填写',
      
      // 乙方信息（公司信息）
      companyName: '杭州石楠文化科技有限公司',
      companyTaxId: '91330105MA2KCLP6X2',
      companyAddress: '浙江省杭州市西湖区文三路259号',
      companyPhone: '0571-88888888',
      
      // 套餐信息（仅用于记录，不用于模板替换）
      selectedPackages: selectedPackages,
      selectedPackageNumbers: variables.selected_package_numbers || 'A',
      selectedPackageLetters: selectedPackageLetters || 'A',
      contractAmount: contractAmount,
      contractAmountChinese: contractAmountChinese,
      
      // 补充信息
      supplementaryInfo: supplementaryInfo,
      supplementaryInfoSection: supplementaryInfoSection,
      
      // 套餐选择状态（用于模板渲染）
      packageAClass: selectedPackages.some((pkg) => pkg.id === 'A') ? 'selected' : '',
      packageBClass: selectedPackages.some((pkg) => pkg.id === 'B') ? 'selected' : '',
      packageCClass: selectedPackages.some((pkg) => pkg.id === 'C') ? 'selected' : '',
      packageDClass: selectedPackages.some((pkg) => pkg.id === 'D') ? 'selected' : '',
      
      // 其他自定义变量
      ...variables
    };

    // 渲染合同内容
    let contractContent = template.template_content;
    
    // 调试日志：输出变量信息
    logger.debug('合同变量', { 
      variableCount: Object.keys(contractVariables).length,
      templateLength: template.template_content.length 
    });
    
    // 替换所有变量 - 使用更强健的替换方法
    let replacedCount = 0;
    Object.entries(contractVariables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const valueStr = String(value || '');
      
      // 检查是否存在该占位符
      if (contractContent.includes(placeholder)) {
        contractContent = contractContent.split(placeholder).join(valueStr);
        replacedCount++;
      }
    });

    // 更新印章样式为叠加效果
    contractContent = updateSealOverlayStyle(contractContent);
    
    // 检查是否还有未替换的变量
    const remainingVariables = contractContent.match(/{{[^}]+}}/g);
    if (remainingVariables) {
      logger.warn('未替换的变量', { remainingVariables });
    }
    
    logger.debug('合同内容处理完成', { 
      replacedCount, 
      finalLength: contractContent.length 
    });

    // 设置合同到期时间
    let expiresAt = null;
    
    // 检查是否设置为长期有效
    if (contractVariables.service_end_date === '长期有效') {
      // 长期有效设置为null，表示永不过期
      expiresAt = null;
    } else if (contractVariables.service_end_date && contractVariables.service_end_date !== '长期有效') {
      // 如果有具体的到期日期，使用该日期
      expiresAt = new Date(contractVariables.service_end_date);
    } else {
      // 默认7天后到期
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

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
        template.id,
        'PENDING',
        contractContent,
        JSON.stringify(contractVariables),
        expiresAt
      ]
    );

    const contractId = (result as any).insertId;
    logger.info('合同创建成功', { contractId, contractNumber });

    // 生成安全的签署令牌和链接
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (process.env.NODE_ENV === 'production' ? 'https://admin.xinghun.info' : 'http://localhost:3000');
    let signUrl = `${baseUrl}/contracts/sign/${contractId}`; // 默认链接
    
    try {
      logger.debug('开始生成安全签署令牌', { contractId });
      
      // 直接调用令牌生成逻辑，避免HTTP请求的权限问题
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24小时有效期

      // 将令牌存储到数据库
      await executeQuery(
        `INSERT INTO contract_sign_tokens (contract_id, token, expires_at, created_at) 
         VALUES (?, ?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE 
         token = VALUES(token), 
         expires_at = VALUES(expires_at), 
         created_at = NOW()`,
        [contractId, token, expiresAt]
      );

      // 生成安全的签署链接
      signUrl = `${baseUrl}/contracts/sign?token=${token}`;
      logger.debug('令牌生成成功', { contractId, tokenLength: token.length });
      
    } catch (error) {
      logger.warn('生成安全签署链接失败，使用默认链接', { 
        contractId, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }

    const response: GenerateContractResponse = {
      contractId,
      contractNumber,
      signUrl,
      expiresAt: expiresAt.toISOString()
    };

    return createSuccessResponse(response, '合同创建成功');
  } catch (error) {
    logger.error('生成合同失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse('生成合同失败', 500);
  }
}
