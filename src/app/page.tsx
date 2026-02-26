import { redirect } from 'next/navigation';

export default function Home() {
  // 直接重定向到 /login，不包含路由组名称
  redirect('/login');
}
