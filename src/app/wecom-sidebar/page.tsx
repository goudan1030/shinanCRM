import { redirect } from 'next/navigation';

interface SidebarIndexPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function WecomSidebarIndexPage({ searchParams }: SidebarIndexPageProps) {
  const resolved = await searchParams;
  const qs = new URLSearchParams();

  Object.entries(resolved).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim()) {
      qs.set(key, value);
    }
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item?.trim()) qs.append(key, item);
      });
    }
  });

  const target = qs.toString()
    ? `/wecom-sidebar/quick-reply?${qs.toString()}`
    : '/wecom-sidebar/quick-reply';
  redirect(target);
}
