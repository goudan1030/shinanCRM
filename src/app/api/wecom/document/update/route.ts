import { NextRequest, NextResponse } from 'next/server';
import { getWecomConfig, getWecomAccessToken } from '@/lib/wecom-api';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/wecom/document/update');

/**
 * 更新企业微信文档内容
 * POST /api/wecom/document/update
 * 
 * 请求体：
 * {
 *   "doc_id": "企业微信文档ID",
 *   "content": "新的文档内容（Markdown格式）",
 *   "append": false // 是否追加内容，false表示替换，true表示追加
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doc_id, content, append = false } = body;

    if (!doc_id) {
      return createErrorResponse('文档ID不能为空', 400);
    }

    if (!content) {
      return createErrorResponse('文档内容不能为空', 400);
    }

    logger.info('开始更新企业微信文档', { doc_id, append });

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

    // 如果需要追加内容，先获取现有内容
    let finalContent = content;
    if (append) {
      try {
        // 获取文档当前内容
        const getDocUrl = `https://qyapi.weixin.qq.com/cgi-bin/doc/get?access_token=${accessToken}&docid=${doc_id}`;
        const getResponse = await fetch(getDocUrl);
        
        if (getResponse.ok) {
          const docData = await getResponse.json();
          if (docData.errcode === 0 && docData.content) {
            // 追加新内容到现有内容
            finalContent = docData.content + '\n\n' + content;
            logger.debug('获取现有内容并追加', { originalLength: docData.content.length });
          }
        }
      } catch (error) {
        logger.warn('获取现有内容失败，将直接替换', { error: error instanceof Error ? error.message : String(error) });
      }
    }

    // 调用企业微信API更新文档
    // 注意：企业微信文档更新API格式可能需要根据最新文档调整
    const updateDocUrl = `https://qyapi.weixin.qq.com/cgi-bin/doc/update?access_token=${accessToken}`;
    
    const updateRequest = {
      docid: doc_id,
      content: finalContent
    };

    logger.debug('调用企业微信更新文档API', { url: updateDocUrl, doc_id });

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
    logger.debug('企业微信API响应', result);

    if (result.errcode !== 0) {
      logger.error('更新企业微信文档失败', { errcode: result.errcode, errmsg: result.errmsg });
      return createErrorResponse(`更新文档失败: ${result.errmsg}`, 500);
    }

    logger.info('企业微信文档更新成功', { doc_id });

    return createSuccessResponse({
      doc_id,
      updated: true
    }, '文档更新成功');

  } catch (error) {
    logger.error('更新企业微信文档失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse(
      error instanceof Error ? error.message : '更新文档失败',
      500
    );
  }
}

