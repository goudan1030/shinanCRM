import { NextRequest, NextResponse } from 'next/server';
import { getWecomConfig, getWecomAccessToken } from '@/lib/wecom-api';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/wecom/document/create');

/**
 * 创建企业微信文档
 * POST /api/wecom/document/create
 * 
 * 请求体：
 * {
 *   "doc_name": "文档名称",
 *   "doc_type": "doc", // doc|sheet|slide
 *   "content": "文档内容（Markdown格式）",
 *   "crm_type": "member", // member|contract|income
 *   "crm_id": 123
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doc_name, doc_type = 'doc', content, crm_type, crm_id, operator_id } = body;

    if (!doc_name) {
      return createErrorResponse('文档名称不能为空', 400);
    }

    if (!content) {
      return createErrorResponse('文档内容不能为空', 400);
    }

    logger.info('开始创建企业微信文档', { doc_name, doc_type, crm_type, crm_id });

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

    // 调用企业微信API创建文档
    // 注意：企业微信文档API可能需要特定的权限和格式
    // 这里提供基础框架，实际实现需要根据企业微信最新API文档调整
    
    const createDocUrl = `https://qyapi.weixin.qq.com/cgi-bin/doc/create?access_token=${accessToken}`;
    
    // 构建文档创建请求
    const docRequest = {
      doc_name,
      doc_type, // 'doc' | 'sheet' | 'slide'
      // 根据文档类型设置不同的内容格式
      content: doc_type === 'doc' ? {
        // 文档类型：支持富文本或Markdown
        text: content
      } : content
    };

    logger.debug('调用企业微信创建文档API', { url: createDocUrl, request: docRequest });

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
    logger.debug('企业微信API响应', result);

    if (result.errcode !== 0) {
      logger.error('创建企业微信文档失败', { errcode: result.errcode, errmsg: result.errmsg });
      return createErrorResponse(`创建文档失败: ${result.errmsg}`, 500);
    }

    const docId = result.docid || result.id;
    const docUrl = result.url || result.doc_url;
    const shareUrl = result.share_url;

    // 保存文档关联信息到数据库
    if (crm_type && crm_id) {
      await executeQuery(
        `INSERT INTO wecom_documents 
        (doc_id, doc_name, doc_type, doc_url, share_url, crm_type, crm_id, created_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [docId, doc_name, doc_type, docUrl, shareUrl, crm_type, crm_id, operator_id || 0]
      );
    }

    logger.info('企业微信文档创建成功', { doc_id: docId, doc_name });

    return createSuccessResponse({
      doc_id: docId,
      doc_name,
      doc_url: docUrl,
      share_url: shareUrl
    }, '文档创建成功');

  } catch (error) {
    logger.error('创建企业微信文档失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse(
      error instanceof Error ? error.message : '创建文档失败',
      500
    );
  }
}

