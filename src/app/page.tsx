import { redirect } from 'next/navigation';

export default function Home() {
  // 重定向到 (auth) 组下的登录页面
  redirect('/(auth)/login');
}
