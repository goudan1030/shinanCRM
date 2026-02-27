'use client';

import { useEffect, useState } from 'react';
import { SEND_ALLOWED_ENTRIES, useWecomSidebarRuntime } from '../_lib/runtime';

type QuickReply = {
  id: number;
  category: string;
  title: string;
  trigger_text: string | null;
  reply_content: string;
};

type SendState = 'idle' | 'sending' | 'success' | 'error' | 'copied';

export default function QuickReplyPage() {
  const runtime = useWecomSidebarRuntime();
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendStates, setSendStates] = useState<Record<number, SendState>>({});
  const [globalMsg, setGlobalMsg] = useState('');

  const canSend = runtime.canSendMessage;

  const fetchQuickReplies = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/wecom-sidebar/quick-replies?${runtime.buildApiParams().toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '获取快捷回复失败');
      setQuickReplies(data.list || []);
    } catch (error) {
      setGlobalMsg(error instanceof Error ? error.message : '获取失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuickReplies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime.key]);

  const setSendState = (id: number, state: SendState) => {
    setSendStates((prev) => ({ ...prev, [id]: state }));
  };

  const handleSend = async (item: QuickReply) => {
    setSendState(item.id, 'sending');
    setGlobalMsg('');

    try {
      const channel = runtime.refreshSendChannel();
      const latestEntry = await runtime.refreshContext().catch(() => runtime.contextEntry);
      const entryAllowed = SEND_ALLOWED_ENTRIES.has(latestEntry);
      // WeixinJSBridge 通道下 entry 可能是 unknown，但通道可用就允许发送
      const allowSend = entryAllowed || (!!channel && channel.includes('WeixinJSBridge'));

      if (!channel || !allowSend) {
        await navigator.clipboard.writeText(item.reply_content);
        setSendState(item.id, 'copied');
        setGlobalMsg(
          !channel
            ? '未检测到企业微信会话能力，内容已复制，请粘贴到聊天框手动发送'
            : `当前入口 (${latestEntry}) 不支持会话发送，内容已复制`
        );
        setTimeout(() => setSendState(item.id, 'idle'), 3000);
        return;
      }

      await runtime.sendChatMessage({ msgtype: 'text', text: { content: item.reply_content } });
      setSendState(item.id, 'success');
      setTimeout(() => setSendState(item.id, 'idle'), 2000);
    } catch (error) {
      const rawMsg = error instanceof Error ? error.message : '发送失败';
      await navigator.clipboard.writeText(item.reply_content).catch(() => {});
      setSendState(item.id, 'copied');

      // permission denied 给出具体原因
      const isPermDenied = rawMsg.toLowerCase().includes('permission denied');
      setGlobalMsg(
        isPermDenied
          ? '应用缺少「客户联系」权限，无法直接发送。内容已复制到剪贴板，请粘贴到聊天框手动发送。（需在企业微信后台为该应用开启客户联系权限）'
          : `${rawMsg}。内容已复制到剪贴板，请粘贴到聊天框手动发送`
      );
      setTimeout(() => setSendState(item.id, 'idle'), 4000);
    }
  };

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
    setGlobalMsg('诊断信息已复制');
  };

  // 按分类分组
  const grouped = quickReplies.reduce<Record<string, QuickReply[]>>((acc, item) => {
    const key = item.category || '默认';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const getSendBtnLabel = (state: SendState) => {
    switch (state) {
      case 'sending': return '发送中…';
      case 'success': return '✓ 已发送';
      case 'copied': return '已复制';
      case 'error': return '失败';
      default: return '发送';
    }
  };

  const getSendBtnClass = (state: SendState) => {
    const base = 'rounded-md px-3 py-1.5 text-xs font-medium transition-colors';
    switch (state) {
      case 'sending': return `${base} bg-gray-100 text-gray-400 cursor-not-allowed`;
      case 'success': return `${base} bg-green-50 text-green-600 border border-green-200`;
      case 'copied': return `${base} bg-yellow-50 text-yellow-600 border border-yellow-200`;
      case 'error': return `${base} bg-red-50 text-red-500 border border-red-200`;
      default: return `${base} bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100`;
    }
  };

  return (
    <div className="space-y-3">
      {/* 状态栏 */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">会话状态</span>
          <button onClick={handleCopyDebugInfo} className="rounded border border-gray-200 px-2 py-0.5 text-gray-500 hover:bg-gray-50">
            复制诊断
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-500">
          <div>
            入口：
            <span className={canSend ? 'text-green-600 font-medium' : 'text-orange-500'}>
              {runtime.contextEntry}
            </span>
          </div>
          <div>
            发送：
            <span className={canSend ? 'text-green-600 font-medium' : 'text-orange-500'}>
              {canSend ? '可用' : '不可用'}
            </span>
          </div>
          <div className="col-span-2 truncate">通道：{runtime.sendChannel || '未检测'}</div>
        </div>
        {!canSend && (
          <div className="rounded-md bg-orange-50 p-2 text-orange-600 text-xs">
            当前入口（{runtime.contextEntry}）不支持直接发送，点击发送按钮将自动复制内容。<br />
            请从企业微信聊天界面工具栏打开此应用以启用直接发送。
          </div>
        )}
      </div>

      {/* 快捷回复列表 */}
      {loading ? (
        <div className="text-center text-gray-400 py-8">加载中…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white py-8 text-center text-gray-400">
          暂无快捷回复模板
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="mb-1.5 px-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">{category}</div>
            <div className="space-y-2">
              {items.map((item) => {
                const state = sendStates[item.id] || 'idle';
                return (
                  <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 truncate">{item.title}</div>
                        <div className="mt-1 text-xs text-gray-500 whitespace-pre-wrap break-words leading-relaxed">
                          {item.reply_content}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSend(item)}
                        disabled={state === 'sending'}
                        className={getSendBtnClass(state)}
                      >
                        {getSendBtnLabel(state)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* 全局消息提示 */}
      {globalMsg && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          {globalMsg}
        </div>
      )}
    </div>
  );
}
