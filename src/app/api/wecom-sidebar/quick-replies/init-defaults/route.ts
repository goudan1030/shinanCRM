import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database-netlify';
import { ensureWecomSidebarTables, verifySidebarAccess } from '@/lib/wecom-sidebar';

const DEFAULT_QUICK_REPLIES = [
  {
    category: '销售',
    title: '优惠说明',
    trigger_text: '优惠',
    reply_content: '需要开通吗，咨询当天开通享优惠，年费优惠99或者额外赠送一个月时长。',
    sort_order: 10
  },
  {
    category: '销售',
    title: '付费确认',
    trigger_text: '付费',
    reply_content:
      '有需要吗，不接受付费请告知互删，企业微信好友位需要从官方购买，好友位不多。',
    sort_order: 20
  },
  {
    category: '详情',
    title: '收费说明',
    trigger_text: '收费',
    reply_content: `形婚互助圈（石楠文化）拥有7年形婚平台服务经验，是专业的形婚信息匹配平台，服务近25000+用户，年平均成功案例近500对；

下面是权益二选一(签订正规服务合同）：
1⃣、1299年费会员，开通会员后会按照会员权益进行推送发布，每天可以找我认识一位你想认识的女生，提供对方编号即可；
2⃣、489元/3次，按次匹配服务，互推微信名片后才扣次数，不成功不扣。

会员将会进入会员群，每天群内单独发布女生信息
服务时间：8:30-19:30，周末及节假日休息

1⃣、了解我们平台，请点击：https://mp.weixin.qq.com/s/2wHha3CRpJQ8HpcuwKdKOQ

2⃣、了解2024年我们的成功案例（部分），请点击：https://mp.weixin.qq.com/s/KfuwEJ3SHH9qmdIEdcC7nQ

女生服务：
1、每周可以免费主动联系认识一位男生
2、男生联系女生免费，不限制次数
3、超过3次不回复不再提供免费服务🌟`,
    sort_order: 30
  },
  {
    category: '服务',
    title: '资料确认',
    trigger_text: '资料',
    reply_content:
      '这是你的资料，请确认，有需要修改请在平台更新，首次更新免费。系统会自动推送，没有问题后将进行推送及服务。',
    sort_order: 40
  },
  {
    category: '服务',
    title: '合同告知',
    trigger_text: '合同',
    reply_content: '这是合同，点击在线签署即可。',
    sort_order: 50
  },
  {
    category: '服务',
    title: '付费告知',
    trigger_text: '支付',
    reply_content: '扫码开通即可，这是我们公司的支付宝，完成后提供下截图我们登记。',
    sort_order: 60
  }
];

/**
 * POST /api/wecom-sidebar/quick-replies/init-defaults
 * 清空现有快捷回复，写入默认业务模板（幂等：可多次调用）
 */
export async function POST(request: NextRequest) {
  try {
    const access = verifySidebarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: 401 });
    }

    await ensureWecomSidebarTables();

    // 先清空所有旧模板
    await executeQuery(`DELETE FROM wecom_quick_replies`);

    // 批量插入新模板
    for (const tpl of DEFAULT_QUICK_REPLIES) {
      await executeQuery(
        `INSERT INTO wecom_quick_replies (category, title, trigger_text, reply_content, sort_order, status)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [tpl.category, tpl.title, tpl.trigger_text, tpl.reply_content, tpl.sort_order]
      );
    }

    return NextResponse.json({
      success: true,
      message: `初始化完成：已写入 ${DEFAULT_QUICK_REPLIES.length} 条模板`,
      total: DEFAULT_QUICK_REPLIES.length
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '初始化失败' },
      { status: 500 }
    );
  }
}
