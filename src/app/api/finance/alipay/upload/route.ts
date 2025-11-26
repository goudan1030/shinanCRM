import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/finance/alipay/upload');

/**
 * 解析支付宝对账单CSV文件
 * CSV格式示例：
 * 交易号,商户订单号,交易时间,交易金额,付款方账号,付款方姓名,交易状态,交易类型,商品名称,备注
 */
function parseAlipayCSV(csvContent: string): Array<{
  trade_no: string;
  out_trade_no: string;
  trade_time: string;
  amount: number;
  payer_account: string;
  payer_name: string;
  trade_status: string;
  trade_type: string;
  product_name: string;
  remark: string;
}> {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV文件格式错误：至少需要表头和数据行');
  }

  // 跳过表头，从第二行开始解析
  const dataLines = lines.slice(1);
  const records: Array<{
    trade_no: string;
    out_trade_no: string;
    trade_time: string;
    amount: number;
    payer_account: string;
    payer_name: string;
    trade_status: string;
    trade_type: string;
    product_name: string;
    remark: string;
  }> = [];

  for (const line of dataLines) {
    if (!line.trim()) continue;

    // 处理CSV格式，支持引号包裹的字段
    const fields = line.split(',').map(field => {
      // 移除首尾引号和空格
      return field.trim().replace(/^["']|["']$/g, '');
    });

    if (fields.length < 10) {
      logger.warn('CSV行格式不完整，跳过', { line, fieldCount: fields.length });
      continue;
    }

    try {
      const amount = parseFloat(fields[3] || '0');
      if (isNaN(amount) || amount <= 0) {
        logger.warn('金额格式错误，跳过', { line, amount: fields[3] });
        continue;
      }

      records.push({
        trade_no: fields[0] || '',
        out_trade_no: fields[1] || '',
        trade_time: fields[2] || '',
        amount,
        payer_account: fields[4] || '',
        payer_name: fields[5] || '',
        trade_status: fields[6] || '',
        trade_type: fields[7] || '',
        product_name: fields[8] || '',
        remark: fields[9] || ''
      });
    } catch (error) {
      logger.warn('解析CSV行失败', { line, error: error instanceof Error ? error.message : String(error) });
      continue;
    }
  }

  return records;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const operatorId = formData.get('operator_id') as string;

    if (!file) {
      return createErrorResponse('请上传CSV文件', 400);
    }

    if (!operatorId) {
      return createErrorResponse('缺少操作人ID', 400);
    }

    // 验证文件类型
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return createErrorResponse('只支持CSV格式文件', 400);
    }

    // 读取文件内容
    const fileContent = await file.text();
    logger.info('开始解析支付宝CSV文件', { fileName: file.name, size: file.size });

    // 解析CSV
    const records = parseAlipayCSV(fileContent);
    logger.info('CSV解析完成', { recordCount: records.length });

    if (records.length === 0) {
      return createErrorResponse('CSV文件中没有有效数据', 400);
    }

    // 插入数据库
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        // 检查是否已存在（根据交易号）
        const [existing] = await executeQuery(
          'SELECT id FROM alipay_transactions WHERE trade_no = ?',
          [record.trade_no]
        );

        let existingRows: any[] = [];
        if (Array.isArray(existing)) {
          if (existing.length === 2 && Array.isArray(existing[0])) {
            existingRows = existing[0];
          } else if (Array.isArray(existing[0])) {
            existingRows = existing[0];
          } else {
            existingRows = existing;
          }
        }

        if (existingRows.length > 0) {
          // 更新已存在的记录
          await executeQuery(
            `UPDATE alipay_transactions SET 
              out_trade_no = ?, trade_time = ?, amount = ?, 
              payer_account = ?, payer_name = ?, trade_status = ?, 
              trade_type = ?, product_name = ?, remark = ?,
              synced_at = NOW(), synced_by = ?
            WHERE trade_no = ?`,
            [
              record.out_trade_no,
              record.trade_time,
              record.amount,
              record.payer_account,
              record.payer_name,
              record.trade_status,
              record.trade_type,
              record.product_name,
              record.remark,
              operatorId,
              record.trade_no
            ]
          );
          logger.debug('更新已存在的支付宝记录', { trade_no: record.trade_no });
        } else {
          // 插入新记录
          await executeQuery(
            `INSERT INTO alipay_transactions 
            (trade_no, out_trade_no, trade_time, amount, payer_account, payer_name, 
             trade_status, trade_type, product_name, remark, synced_at, synced_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
            [
              record.trade_no,
              record.out_trade_no,
              record.trade_time,
              record.amount,
              record.payer_account,
              record.payer_name,
              record.trade_status,
              record.trade_type,
              record.product_name,
              record.remark,
              operatorId
            ]
          );
          logger.debug('插入新的支付宝记录', { trade_no: record.trade_no });
        }
        successCount++;
      } catch (error) {
        failedCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`交易号 ${record.trade_no}: ${errorMsg}`);
        logger.error('处理支付宝记录失败', { trade_no: record.trade_no, error: errorMsg });
      }
    }

    // 记录同步日志
    await executeQuery(
      `INSERT INTO alipay_sync_logs 
      (sync_type, sync_date, total_count, success_count, failed_count, error_message, operator_id) 
      VALUES (?, CURDATE(), ?, ?, ?, ?, ?)`,
      [
        'upload',
        records.length,
        successCount,
        failedCount,
        errors.length > 0 ? errors.join('; ') : null,
        operatorId
      ]
    );

    logger.info('支付宝CSV上传完成', { 
      total: records.length, 
      success: successCount, 
      failed: failedCount 
    });

    return createSuccessResponse({
      total: records.length,
      success: successCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : [] // 只返回前10个错误
    }, '上传完成');

  } catch (error) {
    logger.error('上传支付宝CSV文件失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse(
      error instanceof Error ? error.message : '上传失败',
      500
    );
  }
}

