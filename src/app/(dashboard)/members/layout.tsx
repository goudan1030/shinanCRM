import type { Metadata } from 'next';
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "会员管理 - CRM系统",
  description: "管理系统会员",
};

interface MembersLayoutProps {
  children: ReactNode;
}

export default function MembersLayout({
  children,
}: MembersLayoutProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {children}
      </div>
    </div>
  );
} 