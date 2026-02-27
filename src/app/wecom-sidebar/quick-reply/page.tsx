'use client';

import { useEffect, useState } from 'react';
import {
  SEND_ALLOWED_ENTRIES,
  useWecomSidebarRuntime
} from '../_lib/runtime';

type QuickReply = {
  id: number;
  category: string;
  title: string;
  trigger_text: string | null;
  reply_content: string;
};

export default function QuickReplyPage() {
  const runtime = useWecomSidebarRuntime();
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const canSendInCurrentEntry = SEND_ALLOWED_ENTRIES.has(runtime.contextEntry);

  const handleCopyDebugInfo = async () => {
    const debugText = [
      `raw_query: ${runtime.rawQuery || '(empty)'}`,
      `wecomUserId: ${runtime.wecomUserId || '(empty)'}`,
      `toUserId: ${runtime.toUserId || '(empty)'}`,
      `key: ${runtime.key ? '(exists)' : '(empty)'}`,
      `sendChannel: ${runtime.sendChannel}`,
      `sdkStatus: ${runtime.sdkStatus}`,
      `contextEntry: ${runtime.contextEntry}`,
      `contextSource: ${runtime.contextSource}`,
      `contactStatus: ${runtime.contactStatus}`
    ].join('\n');
    await navigator.clipboard.writeText(debugText);
    setMessage('诊断信息已复制，可直接发给开发排查');
  };

  const fetchQuickReplies = async () => {
    const response = await fetch(`/api/wecom-sidebar/quick-replies?${runtime.buildApiParams().toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '获取快捷回复失败');
    setQuickReplies(data.list || []);
  };

  useEffect(() => {
    fetchQuickReplies().catch((error) => setMessage(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime.key]);

  const handleInsertQuickReply = async (content: string) => {
    setLoading(true);
    setMessage('');

    try {
      const channel = runtime.refreshSendChannel();
      const latestEntry = await runtime.refreshContext().catch(() => runtime.contextEntry);
      const allowByEntry = SEND_ALLOWED_ENTRIES.has(latestEntry);

      if (!channel) {
        await navigator.clipboard.writeText(content);
        setMessage('未检测到企业微信会话能力，已复制内容，请粘贴到聊天输入框后手动发送');
        return;
      }

      if (!allowByEntry) {
        await navigator.clipboard.writeText(content);
        setMessage(`当前入口(${latestEntry})不支持会话发送（官方要求：single_chat_tools/group_chat_tools），已复制内容`);
        return;
      }

      const ww = (window as any)?.ww;
      const wxQy = (window as any)?.wx?.qy;
      const bridge = (window as any)?.WeixinJSBridge;

      if (channel === 'ww.sendChatMessage') {
        await ww.sendChatMessage({
          msgtype: 'text',
          text: { content }
        });
      } else if (channel === 'wx.qy.sendChatMessage') {
        await new Promise<void>((resolve, reject) => {
          wxQy.sendChatMessage({
            msgtype: 'text',
            text: { content },
            success: () => resolve(),
            fail: (err: any) => reject(new Error(err?.errMsg || err?.errmsg || '写入聊天框失败'))
          });
        });
      } else if (channel === 'WeixinJSBridge.invoke(sendChatMessage)') {
        await new Promise<void>((resolve, reject) => {
          bridge.invoke('sendChatMessage', { msgtype: 'text', text: { content } }, (res: any) => {
            const errMsg = (res?.err_msg || '').toLowerCase();
            if (errMsg.includes('ok')) {
              resolve();
              return;
            }
            reject(new Error(res?.err_msg || '写入聊天框失败'));
          });
        });
      }

      setMessage('内容已写入会话输入区域，请在聊天窗口手动点击发送');
    } catch (error) {
      const text = error instanceof Error ? error.message : '写入失败';
      await navigator.clipboard.writeText(content);
      setMessage(`${text}，已复制内容，请粘贴到输入框后手动发送`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-lg border border-gray-200 p-3">
      <div className="mb-2 font-semibold">快捷回复</div>
      <div className="mb-2 text-xs text-gray-500">
        发送通道：{runtime.wecomClientReady ? runtime.sendChannel : '未检测到会话写入能力'}
      </div>
      <div className="mb-2 text-xs text-gray-500">SDK状态：{runtime.sdkStatus}</div>
      <div className="mb-2 text-xs text-gray-500">
        会话入口：{runtime.contextEntry}（{runtime.contextSource}）
      </div>
      <div className="mb-2 text-xs text-gray-500">
        入口能力：发送{canSendInCurrentEntry ? '可用' : '不可用'}
      </div>
      <div className="mb-2 text-xs text-gray-500">客户ID获取状态：{runtime.contactStatus}</div>

      <div className="mb-2">
        <input
          value={runtime.toUserId}
          onChange={(e) => runtime.setToUserId(e.target.value.trim())}
          placeholder="接收人UserID（自动识别失败时可手动填写）"
          className="w-full rounded-md border border-gray-300 px-2 py-1.5"
        />
      </div>

      <div className="mb-2 rounded-md border border-dashed border-gray-300 bg-gray-50 p-2 text-xs text-gray-600">
        <div>识别到的 wecom_userid：{runtime.wecomUserId || '未识别'}</div>
        <div>识别到的 to_userid：{runtime.toUserId || '未识别'}</div>
        <button type="button" onClick={handleCopyDebugInfo} className="mt-1 rounded-md border px-2 py-1 text-xs">
          复制诊断信息
        </button>
      </div>

      <div className="grid gap-2">
        {quickReplies.map((item) => (
          <div key={item.id} className="rounded-md border border-gray-200 p-2">
            <div className="font-medium">{item.title}</div>
            <div className="mb-1 text-xs text-gray-500">{item.category}</div>
            <div className="mb-1.5 whitespace-pre-wrap">{item.reply_content}</div>
            <button
              onClick={() => handleInsertQuickReply(item.reply_content)}
              disabled={loading}
              className="rounded-md border px-2 py-1"
            >
              发送
            </button>
          </div>
        ))}
        {quickReplies.length === 0 && <div className="text-gray-500">暂无快捷回复模板</div>}
      </div>

      {message && <div className="mt-3 text-blue-600">{message}</div>}
    </section>
  );
}
