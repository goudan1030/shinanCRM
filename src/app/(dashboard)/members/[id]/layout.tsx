interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function Layout({ children }: LayoutProps) {
  return children;
} 