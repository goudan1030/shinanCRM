'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ContractPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到合同列表页面
    router.replace('/contracts/list');
  }, [router]);

  return null;
}
