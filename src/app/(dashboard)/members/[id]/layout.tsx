interface LayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

export default async function Layout({ children }: LayoutProps) {
  return children;
} 