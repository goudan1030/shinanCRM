import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/finance/alipay/notify');

/**
 * 支付宝收款回调通知接口
 * POST /api/finance/alipay/notify
 * 
 * 当支付宝收到收款时，会调用此接口实时通知
 * 需要在支付宝商户平台配置此回调地址
 */
export async function POST(request: NextRequest) {
  try {
    // 获取支付宝回调数据（可能是form-data或JSON）
    const contentType = request.headers.get('content-type') || '';
    let notifyData: any = {};

    if (contentType.includes('application/json')) {
      notifyData = await request.json();
    } else {
      // 处理form-data格式
      const formData = await request.formData();
      notifyData = Object.fromEntries(formData.entries());
    }

    logger.info('收到支付宝回调通知', { data: notifyData });

    // TODO: 验证支付宝签名
    // 需要验证回调数据的签名，确保是支付宝发送的
    // const isValid = verifyAlipaySignature(notifyData);
    // if (!isValid) {
    //   return createErrorResponse('签名验证失败', 400);
    // }

    // 提取交易信息
    const tradeNo = notifyData.trade_no || notifyData.out_trade_no;
    const amount = parseFloat(notifyData.total_amount || notifyData.amount || '0');
    const tradeStatus = notifyData.trade_status || notifyData.status;
    const tradeTime = notifyData.gmt_payment || notifyData.pay_time || new Date().toISOString();
    const buyerId = notifyData.buyer_id || '';
    const buyerLogonId = notifyData.buyer_logon_id || '';
    const subject = notifyData.subject || '';

    // 只处理交易成功的通知
    if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== '交易成功') {
      logger.debug('忽略非成功交易', { trade_no: tradeNo, status: tradeStatus });
      return createSuccessResponse({ received: true }, '已接收');
    }

    // 检查是否已存在
    const [existing] = await executeQuery(
      'SELECT id FROM alipay_transactions WHERE trade_no = ?',
      [tradeNo]
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
      logger.debug('交易记录已存在，跳过', { trade_no: tradeNo });
      return createSuccessResponse({ received: true }, '已接收');
    }

    // 尝试匹配会员
    let memberNo: string | null = null;
    if (buyerLogonId) {
      const phonePattern = buyerLogonId.replace(/\*/g, '%');
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
      }
    }

    // 创建收入记录
    const paymentDate = new Date(tradeTime).toISOString().split('T')[0];
    const notes = `支付宝交易号: ${tradeNo}${buyerLogonId ? ` | 付款方: ${buyerLogonId}` : ''}`;

    const [incomeResult] = await executeQuery(
      `INSERT INTO income_records 
      (member_no, payment_date, payment_method, amount, notes, operator_id) 
      VALUES (?, ?, '支付宝', ?, ?, 0)`,
      [memberNo || '', paymentDate, amount, notes]
    );

    interface InsertResult {
      insertId: number;
      affectedRows: number;
    }
    const incomeId = incomeResult && typeof incomeResult === 'object' && 'insertId' in incomeResult
      ? (incomeResult as InsertResult).insertId
      : null;

    // 保存到支付宝记录表
    await executeQuery(
      `INSERT INTO alipay_transactions 
      (trade_no, out_trade_no, trade_time, amount, payer_account, payer_name, 
       trade_status, trade_type, product_name, remark, member_no, synced_at, synced_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
      [
        tradeNo,
        notifyData.out_trade_no || '',
        tradeTime,
        amount,
        buyerLogonId,
        notifyData.buyer_name || '',
        tradeStatus,
        notifyData.trade_type || '',
        subject,
        JSON.stringify(notifyData),
        memberNo
      ]
    );

    logger.info('支付宝收款通知处理成功', { 
      trade_no: tradeNo, 
      income_id: incomeId,
      member_no: memberNo || '未匹配'
    });

    // 返回success给支付宝（支付宝要求返回success字符串）
    return new NextResponse('success', { status: 200 });

  } catch (error) {
    logger.error('处理支付宝回调通知失败', error instanceof Error ? error : new Error(String(error)));
    // 即使处理失败，也要返回success，避免支付宝重复通知
    return new NextResponse('success', { status: 200 });
  }
}

