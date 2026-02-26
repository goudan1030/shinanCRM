'use client';

import { ErrorBoundary } from '@/components/utils/error-boundary';

export function ClientErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

