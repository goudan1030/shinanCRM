'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card } from '@/components/ui/card';

export default function MiniappReviewPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login');
    }
  }, [isLoading, session, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">审核管理</h2>
      </div>

      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          审核管理功能开发中...
        </div>
      </Card>
    </div>
  );
}