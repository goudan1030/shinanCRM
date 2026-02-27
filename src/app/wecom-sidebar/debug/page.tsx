'use client';

import { useMemo, useState } from 'react';
import { useWecomSidebarRuntime } from '../_lib/runtime';

function getRuntimeFlags() {
  if (typeof window === 'undefined') {
    return {
      hasWindow: false,
      hasWx: false,
      hasWw: false,
      hasBridge: false
    };
  }

  const w = window as any;
  return {
    hasWindow: true,
    hasWx: Boolean(w?.wx),
    hasWw: Boolean(w?.ww),
    hasBridge: Boolean(w?.WeixinJSBridge),
    hasWxConfig: typeof w?.wx?.config === 'function',
    hasWxAgentConfig: typeof w?.wx?.agentConfig === 'function',
    hasWxQyGetContext: typeof w?.wx?.qy?.getContext === 'function',
    hasWxQySendChatMessage: typeof w?.wx?.qy?.sendChatMessage === 'function',
    hasWxQyGetCurExternalContact: typeof w?.wx?.qy?.getCurExternalContact === 'function',
    hasWwGetContext: typeof w?.ww?.getContext === 'function',
    hasWwSendChatMessage: typeof w?.ww?.sendChatMessage === 'function',
    hasWwGetCurExternalContact: typeof w?.ww?.getCurExternalContact === 'function',
    hasBridgeInvoke: typeof w?.WeixinJSBridge?.invoke === 'function'
  };
}

export default function WecomSidebarDebugPage() {
  const runtime = useWecomSidebarRuntime();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const flags = useMemo(() => getRuntimeFlags(), [runtime.sdkStatus, runtime.sendChannel, runtime.contextEntry]);

  const diagText = useMemo(() => {
    const lines = [
      `url: ${typeof window !== 'undefined' ? window.location.href : '(ssr)'}`,
      `raw_query: ${runtime.rawQuery || '(empty)'}`,
      `wecomUserId: ${runtime.wecomUserId || '(empty)'}`,
      `toUserId: ${runtime.toUserId || '(empty)'}`,
      `key: ${runtime.key ? '(exists)' : '(empty)'}`,
      `sendChannel: ${runtime.sendChannel}`,
      `sdkStatus: ${runtime.sdkStatus}`,
      `contextEntry: ${runtime.contextEntry}`,
      `contextSource: ${runtime.contextSource}`,
      `contactStatus: ${runtime.contactStatus}`,
      `ua: ${typeof navigator !== 'undefined' ? navigator.userAgent : '(unknown)'}`,
      `flags: ${JSON.stringify(flags)}`
    ];
    return lines.join('\n');
  }, [runtime, flags]);

  const handleRetry = async () => {
    setBusy(true);
    setMessage('');
    try {
      runtime.refreshSendChannel();
      await runtime.refreshContext();
      await runtime.refreshExternalContact();
      setMessage('已手动重试获取上下文与客户信息');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '重试失败');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(diagText);
    setMessage('诊断信息已复制');
  };

  return (
    <section className="rounded-lg border border-gray-200 p-3">
      <div className="mb-2 font-semibold">调试页面</div>
      <div className="mb-2 text-xs text-gray-500">
        用于主动输出企业微信运行环境与上下文信息，排查 entry / userid 获取失败问题。
      </div>
      <div className="mb-3 flex gap-2">
        <button onClick={handleRetry} disabled={busy} className="rounded-md border px-2.5 py-1.5">
          手动重试上下文
        </button>
        <button onClick={handleCopy} className="rounded-md border px-2.5 py-1.5">
          复制诊断信息
        </button>
      </div>

      <pre className="max-h-[420px] overflow-auto rounded-md bg-gray-50 p-2 text-[11px] leading-5 whitespace-pre-wrap">
        {diagText}
      </pre>

      {message && <div className="mt-3 text-blue-600">{message}</div>}
    </section>
  );
}
