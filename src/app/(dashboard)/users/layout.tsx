import type { Metadata } from 'next';
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "用户管理 - CRM系统",
  description: "管理系统用户",
};

interface UsersLayoutProps {
  children: ReactNode;
}

export default function UsersLayout({ children }: UsersLayoutProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">用户管理</h2>
        </div>
        {children}
      </div>
    </div>
  );
} 