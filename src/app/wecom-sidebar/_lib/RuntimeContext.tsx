'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useWecomSidebarRuntime, type SidebarRuntime } from './runtime';

const WecomRuntimeContext = createContext<SidebarRuntime | null>(null);

/**
 * 在 Layout 层调用一次，所有子页面通过 useWecomRuntime() 共享同一 SDK 实例
 */
export function WecomRuntimeProvider({ children }: { children: ReactNode }) {
  const runtime = useWecomSidebarRuntime();
  return (
    <WecomRuntimeContext.Provider value={runtime}>
      {children}
    </WecomRuntimeContext.Provider>
  );
}

/**
 * 页面级 hook：从 Context 读取共享的 Runtime 状态
 * 必须在 WecomRuntimeProvider 内部使用
 */
export function useWecomRuntime(): SidebarRuntime {
  const ctx = useContext(WecomRuntimeContext);
  if (!ctx) throw new Error('useWecomRuntime must be used within WecomRuntimeProvider');
  return ctx;
}
