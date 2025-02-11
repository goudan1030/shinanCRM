import { Metadata } from 'next';
import MemberDetail from './member-detail';  // 我们需要创建这个新组件

export const metadata: Metadata = {
  title: '会员详情',
  description: '会员详细信息页面',
};

type PageProps = {
  params: {
    id: string;
  };
};

export default async function MemberDetailPage({ params }: PageProps) {
  const { id } = params;
  
  return <MemberDetail id={id} />;
}