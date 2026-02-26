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

    // 处理记录：保存到支付宝表并导入到收入记录表
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        // 只处理交易成功的记录
        if (record.trade_status !== '交易成功' && record.trade_status !== '成功') {
          logger.debug('跳过非成功交易', { trade_no: record.trade_no, status: record.trade_status });
          continue;
        }

        // 尝试根据付款方信息匹配会员
        let memberNo: string | null = null;
        
        // 先尝试根据付款方账号（手机号）匹配
        if (record.payer_account) {
          const phonePattern = record.payer_account.replace(/\*/g, '%');
          const [memberResult] = await executeQuery(
            'SELECT member_no FROM members WHERE phone LIKE ? LIMIT 1',
            [phonePattern]
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
          
          if (memberRows.length > 0) {
            memberNo = memberRows[0].member_no;
            logger.debug('根据手机号匹配到会员', { trade_no: record.trade_no, member_no: memberNo });
          }
        }

        // 如果没匹配到，尝试根据付款方姓名匹配
        if (!memberNo && record.payer_name) {
          const [memberResult] = await executeQuery(
            'SELECT member_no FROM members WHERE nickname LIKE ? OR real_name LIKE ? LIMIT 1',
            [`%${record.payer_name}%`, `%${record.payer_name}%`]
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
          
          if (memberRows.length > 0) {
            memberNo = memberRows[0].member_no;
            logger.debug('根据姓名匹配到会员', { trade_no: record.trade_no, member_no: memberNo });
          }
        }

        // 检查收入记录是否已存在（根据交易号或交易时间+金额）
        const [existingIncome] = await executeQuery(
          `SELECT id FROM income_records 
           WHERE payment_method = '支付宝' 
           AND payment_date = DATE(?)
           AND amount = ?
           AND notes LIKE ?`,
          [record.trade_time, record.amount, `%${record.trade_no}%`]
        );

        let existingIncomeRows: any[] = [];
        if (Array.isArray(existingIncome)) {
          if (existingIncome.length === 2 && Array.isArray(existingIncome[0])) {
            existingIncomeRows = existingIncome[0];
          } else if (Array.isArray(existingIncome[0])) {
            existingIncomeRows = existingIncome[0];
          } else {
            existingIncomeRows = existingIncome;
          }
        }

        if (existingIncomeRows.length > 0) {
          // 收入记录已存在，只更新支付宝记录表
          logger.debug('收入记录已存在，跳过', { trade_no: record.trade_no });
        } else {
          // 创建收入记录
          const paymentDate = record.trade_time ? new Date(record.trade_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          const notes = `支付宝交易号: ${record.trade_no}${record.payer_name ? ` | 付款方: ${record.payer_name}` : ''}${record.remark ? ` | ${record.remark}` : ''}`;

          const [incomeResult] = await executeQuery(
            `INSERT INTO income_records 
            (member_no, payment_date, payment_method, amount, notes, operator_id) 
            VALUES (?, ?, '支付宝', ?, ?, ?)`,
            [
              memberNo || '',
              paymentDate,
              record.amount,
              notes,
              operatorId
            ]
          );

          interface InsertResult {
            insertId: number;
            affectedRows: number;
          }
          const incomeId = incomeResult && typeof incomeResult === 'object' && 'insertId' in incomeResult
            ? (incomeResult as InsertResult).insertId
            : null;

          logger.info('创建收入记录成功', { 
            trade_no: record.trade_no, 
            income_id: incomeId,
            member_no: memberNo || '未匹配'
          });
        }

        // 保存到支付宝记录表（用于记录和查询）
        const [existingAlipay] = await executeQuery(
          'SELECT id FROM alipay_transactions WHERE trade_no = ?',
          [record.trade_no]
        );

        let existingAlipayRows: any[] = [];
        if (Array.isArray(existingAlipay)) {
          if (existingAlipay.length === 2 && Array.isArray(existingAlipay[0])) {
            existingAlipayRows = existingAlipay[0];
          } else if (Array.isArray(existingAlipay[0])) {
            existingAlipayRows = existingAlipay[0];
          } else {
            existingAlipayRows = existingAlipay;
          }
        }

        if (existingAlipayRows.length > 0) {
          // 更新已存在的记录
          await executeQuery(
            `UPDATE alipay_transactions SET 
              out_trade_no = ?, trade_time = ?, amount = ?, 
              payer_account = ?, payer_name = ?, trade_status = ?, 
              trade_type = ?, product_name = ?, remark = ?,
              member_no = ?, synced_at = NOW(), synced_by = ?
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
              memberNo,
              operatorId,
              record.trade_no
            ]
          );
        } else {
          // 插入新记录
          await executeQuery(
            `INSERT INTO alipay_transactions 
            (trade_no, out_trade_no, trade_time, amount, payer_account, payer_name, 
             trade_status, trade_type, product_name, remark, member_no, synced_at, synced_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
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
              memberNo,
              operatorId
            ]
          );
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
      imported: successCount, // 已导入到收入管理的数量
      errors: errors.length > 0 ? errors.slice(0, 10) : [] // 只返回前10个错误
    }, `上传完成，已导入 ${successCount} 条收入记录`);

  } catch (error) {
    logger.error('上传支付宝CSV文件失败', error instanceof Error ? error : new Error(String(error)));
    return createErrorResponse(
      error instanceof Error ? error.message : '上传失败',
      500
    );
  }
}

