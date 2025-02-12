import MemberDetail from './member-detail';

export async function generateMetadata() {
  return {
    title: '会员详情',
    description: '会员详细信息页面',
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberPage({ params }: PageProps) {
  const resolvedParams = await params;
  return <MemberDetail memberId={resolvedParams.id} />;
}