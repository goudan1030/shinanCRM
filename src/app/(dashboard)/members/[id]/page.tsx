import { Metadata } from 'next';
import MemberDetail from './member-detail';

export const metadata: Metadata = {
  title: '会员详情',
  description: '会员详细信息页面',
};

interface PageProps {
  params: {
    id: string;
  };
}

export default function MemberDetailPage({ params }: PageProps) {
  return (
    <MemberDetail id={params.id} />
  );
}