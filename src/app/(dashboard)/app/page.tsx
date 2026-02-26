import { redirect } from 'next/navigation';

export default function AppPage() {
  // 重定向到APP基础配置页面
  redirect('/app/config');
}
