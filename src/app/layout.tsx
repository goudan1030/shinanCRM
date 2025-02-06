import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RootLayout } from '@/components/layout/root-layout';
import { AuthProvider } from '@/contexts/auth-context';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SNCRM - 客户关系管理系统",
  description: "一个现代化的客户关系管理系统",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <RootLayout>
          <AuthProvider>{children}</AuthProvider>
        </RootLayout>
      </body>
    </html>
  );
}
