import { NextRequest, NextResponse } from 'next/server';
import { getWecomConfig, getWecomAccessToken } from '@/lib/wecom-api';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/wecom/document/sync-member');

/**
 * 同步会员信息到企业微信文档
 * POST /api/wecom/document/sync-member
 * 
 * 请求体：
 * {
 *   "doc_id": "企业微信文档ID",
 *   "member_id": 123, // 可选，如果提供则同步单个会员
 *   "append": true // 是否追加内容，false表示替换
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doc_id, member_id, append = true } = body;

    if (!doc_id) {
      return createErrorResponse('文档ID不能为空', 400);
    }

    logger.info('开始同步会员信息到企业微信文档', { doc_id, member_id, append });

    // 获取会员数据
    let members: any[] = [];
    
    if (member_id) {
      // 同步单个会员
      const [memberResult] = await executeQuery(
        `SELECT * FROM members WHERE id = ?`,
        [member_id]
      );
      
      let memberRows: any[] = [];
      if (Array.isArray(memberResult)) {
        if (memberResult.length === 2 && Array.isArray(memberResult[0])) {
          memberRows = memberResult[0];
        } else if (Array.isArray(memberResult[0])) {
          memberRows = memberResult[0];
        } else {
          memberRows = memberResult;
        }
      }
      
      if (memberRows.length === 0) {
        return createErrorResponse('会员不存在', 404);
      }
      
      members = memberRows;
    } else {
      // 同步所有活跃会员
      const [memberResult] = await executeQuery(
        `SELECT * FROM members WHERE status = 'ACTIVE' ORDER BY created_at DESC LIMIT 100`
      );
      
      let memberRows: any[] = [];
      if (Array.isArray(memberResult)) {
        if (memberResult.length === 2 && Array.isArray(memberResult[0])) {
          memberRows = memberResult[0];
        } else if (Array.isArray(memberResult[0])) {
          memberRows = memberResult[0];
        } else {
          memberRows = memberResult;
        }
      }
      
      members = memberRows;
    }

    if (members.length === 0) {
      return createErrorResponse('没有找到会员数据', 404);
    }

    // 格式化会员信息为Markdown
    const formatMember = (member: any): string => {
      const typeMap: { [key: string]: string } = {
        'ANNUAL': '年费会员',
        'ONE_TIME': '一次性会员',
        'NORMAL': '普通会员'
      };
      const genderMap: { [key: string]: string } = {
        'male': '男',
        'female': '女',
        'other': '其他'
      };
      
      return `## ${member.member_no || '未分配'} - ${member.nickname || '未填写'}

- **类型**：${typeMap[member.type] || member.type}
- **性别**：${genderMap[member.gender] || member.gender}
- **手机**：${member.phone || '未填写'}
- **微信**：${member.wechat || '未填写'}
- **地区**：${[member.province, member.city, member.district].filter(Boolean).join(' ') || '未填写'}
- **出生年份**：${member.birth_year || '未填写'}
- **身高**：${member.height ? member.height + 'cm' : '未填写'}
- **体重**：${member.weight ? member.weight + 'kg' : '未填写'}
- **学历**：${member.education || '未填写'}
- **职业**：${member.occupation || '未填写'}
- **登记时间**：${new Date(member.created_at).toLocaleString('zh-CN')}

${member.self_description ? `**个人说明**：${member.self_description}\n` : ''}
${member.partner_requirement ? `**择偶要求**：${member.partner_requirement}\n` : ''}

---`;
    };

    // 生成文档内容
    const content = members.length === 1 
      ? formatMember(members[0])
      : `# 会员信息汇总\n\n更新时间：${new Date().toLocaleString('zh-CN')}\n\n共 ${members.length} 位会员\n\n${members.map(formatMember).join('\n\n')}`;

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

    // 更新文档
    const updateDocUrl = `https://qyapi.weixin.qq.com/cgi-bin/doc/update?access_token=${accessToken}`;
    
    const updateRequest = {
      docid: doc_id,
      content: append ? `\n\n${content}` : content // 追加模式在内容前加换行
    };

    logger.debug('调用企业微信更新文档API', { doc_id, contentLength: content.length });

    const response = await fetch(updateDocUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('企业微信API请求失败', { status: response.status, error: errorText });
      return createErrorResponse(`企业微信API请求失败: ${response.status}`, 500);
    }

    const result = await response.json();

    if (result.errcode !== 0) {
      logger.error('更新企业微信文档失败', { errcode: result.errcode, errmsg: result.errmsg });
      return createErrorResponse(`更新文档失败: ${result.errmsg}`, 500);
    }

    logger.info('会员信息同步到企业微信文档成功', { doc_id, memberCount: members.length });

    return createSuccessResponse({
      doc_id,
      member_count: members.length,
      updated: true
    }, '同步成功');

  } catch (error) {
    logger.error('同步会员信息到企业微信文档失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse(
      error instanceof Error ? error.message : '同步失败',
      500
    );
  }
}

