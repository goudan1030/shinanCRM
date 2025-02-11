import { Metadata } from 'next';
import MemberDetail from './member-detail';

export const metadata: Metadata = {
  title: '会员详情',
  description: '会员详细信息页面',
};

type Props = {
  params: { id: string }
}

export default async function MemberDetailPage({ params }: Props) {
  return (
    <MemberDetail id={params.id} />
  );
}