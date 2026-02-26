import { NextRequest, NextResponse } from 'next/server';
import { getWecomConfig, getWecomAccessToken } from '@/lib/wecom-api';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/wecom/document/member-summary');

/**
 * 创建会员汇总文档
 * POST /api/wecom/document/member-summary
 * 
 * 自动生成会员汇总报告并创建企业微信文档
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, operator_id } = body;

    const summaryDate = date || new Date().toISOString().split('T')[0];
    logger.info('开始创建会员汇总文档', { date: summaryDate });

    // 获取会员统计数据
    const [memberStats] = await executeQuery(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN type = 'ANNUAL' THEN 1 END) as annual_count,
        COUNT(CASE WHEN type = 'ONE_TIME' THEN 1 END) as one_time_count,
        COUNT(CASE WHEN type = 'NORMAL' THEN 1 END) as normal_count,
        COUNT(CASE WHEN gender = 'male' THEN 1 END) as male_count,
        COUNT(CASE WHEN gender = 'female' THEN 1 END) as female_count,
        COUNT(CASE WHEN DATE(created_at) = ? THEN 1 END) as today_new
      FROM members
      WHERE status = 'ACTIVE'
    `, [summaryDate]);

    let stats: any = {};
    if (Array.isArray(memberStats)) {
      const rows = Array.isArray(memberStats[0]) ? memberStats[0] : memberStats;
      stats = rows[0] || {};
    }

    // 获取最近新增的会员
    const [recentMembers] = await executeQuery(`
      SELECT member_no, nickname, phone, type, gender, province, city, created_at
      FROM members
      WHERE DATE(created_at) = ?
      ORDER BY created_at DESC
      LIMIT 20
    `, [summaryDate]);

    let members: any[] = [];
    if (Array.isArray(recentMembers)) {
      members = Array.isArray(recentMembers[0]) ? recentMembers[0] : recentMembers;
    }

    // 格式化文档内容（Markdown格式）
    const docContent = `# 会员汇总报告

**生成日期**：${summaryDate}

## 📊 统计概览

- **会员总数**：${stats.total || 0}
- **年费会员**：${stats.annual_count || 0}
- **一次性会员**：${stats.one_time_count || 0}
- **普通会员**：${stats.normal_count || 0}
- **男性会员**：${stats.male_count || 0}
- **女性会员**：${stats.female_count || 0}
- **今日新增**：${stats.today_new || 0}

## 📋 今日新增会员

${members.length > 0 ? members.map((m: any) => {
  const typeMap: { [key: string]: string } = {
    'ANNUAL': '年费',
    'ONE_TIME': '一次性',
    'NORMAL': '普通'
  };
  const genderMap: { [key: string]: string } = {
    'male': '男',
    'female': '女'
  };
  return `- **${m.member_no}** | ${m.nickname || '未填写'} | ${genderMap[m.gender] || '未知'} | ${typeMap[m.type] || m.type} | ${m.province || ''}${m.city || ''} | ${new Date(m.created_at).toLocaleString('zh-CN')}`;
}).join('\n') : '今日无新增会员'}

---
*本报告由CRM系统自动生成*
`;

    // 获取企业微信配置
    const config = await getWecomConfig();
    if (!config) {
      return createErrorResponse('企业微信配置不存在', 500);
    }

    // 获取Access Token
    const accessToken = await getWecomAccessToken(config);
    if (!accessToken) {
      return createErrorResponse('无法获取企业微信Access Token', 500);
    }

    // 创建文档
    const docName = `会员汇总报告-${summaryDate}`;
    const createDocUrl = `https://qyapi.weixin.qq.com/cgi-bin/doc/create?access_token=${accessToken}`;
    
    const docRequest = {
      doc_name: docName,
      doc_type: 'doc',
      content: {
        text: docContent
      }
    };

    logger.debug('调用企业微信创建文档API', { doc_name: docName });

    const response = await fetch(createDocUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(docRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('企业微信API请求失败', { status: response.status, error: errorText });
      return createErrorResponse(`企业微信API请求失败: ${response.status}`, 500);
    }

    const result = await response.json();

    if (result.errcode !== 0) {
      logger.error('创建企业微信文档失败', { errcode: result.errcode, errmsg: result.errmsg });
      return createErrorResponse(`创建文档失败: ${result.errmsg}`, 500);
    }

    const docId = result.docid || result.id;
    const docUrl = result.url || result.doc_url;
    const shareUrl = result.share_url;

    // 保存文档关联信息
    await executeQuery(
      `INSERT INTO wecom_documents 
      (doc_id, doc_name, doc_type, doc_url, share_url, crm_type, created_by) 
      VALUES (?, ?, 'doc', ?, ?, 'member_summary', ?)`,
      [docId, docName, docUrl, shareUrl, operator_id || 0]
    );

    logger.info('会员汇总文档创建成功', { doc_id: docId, doc_name: docName });

    return createSuccessResponse({
      doc_id: docId,
      doc_name: docName,
      doc_url: docUrl,
      share_url: shareUrl
    }, '文档创建成功');

  } catch (error) {
    logger.error('创建会员汇总文档失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse(
      error instanceof Error ? error.message : '创建文档失败',
      500
    );
  }
}

