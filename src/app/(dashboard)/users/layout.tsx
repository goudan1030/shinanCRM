'use client';

import { Suspense } from 'react';
import { ThreeColumnLayout } from '@/components/layout/three-column-layout';
import { Sidebar } from '@/components/layout/sidebar';
import { UserFilter } from '@/components/user/user-filter';
import type { Metadata } from 'next';
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "用户管理 - CRM系统",
  description: "管理系统用户",
};

function UsersLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThreeColumnLayout 
      sidebarContent={<Sidebar />}
      middleContent={<UserFilter />}
      useThreeColumns={true}
      className="bg-gray-50"
    >
      {children}
    </ThreeColumnLayout>
  );
}

export default function UsersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    }>
      <UsersLayoutContent>{children}</UsersLayoutContent>
    </Suspense>
  );
} 