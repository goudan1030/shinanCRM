'use client';

import { type ReactNode } from 'react';
import { WecomRuntimeProvider, useWecomRuntime } from '../_lib/RuntimeContext';

/**
 * SDK 等待门：sdkInitialized 为 false 时显示 loading，就绪后才渲染子内容
 * 这样无论切换哪个 Tab，SDK 都已完成初始化
 */
function SdkLoadingGate({ children }: { children: ReactNode }) {
  const runtime = useWecomRuntime();

  if (!runtime.sdkInitialized) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-500" />
        <div className="text-center space-y-1">
          <p className="text-sm text-gray-500">企业微信初始化中，请稍候…</p>
          <p className="text-xs text-gray-300">{runtime.sdkStatus}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * 客户端壳：在 Layout（服务端组件）中使用
 * 1. 提供 WecomRuntimeProvider（SDK 只初始化一次）
 * 2. 通过 SdkLoadingGate 阻止子页面在 SDK 就绪前渲染
 */
export default function WecomClientShell({ children }: { children: ReactNode }) {
  return (
    <WecomRuntimeProvider>
      <main className="flex-1 p-3">
        <SdkLoadingGate>{children}</SdkLoadingGate>
      </main>
    </WecomRuntimeProvider>
  );
}
