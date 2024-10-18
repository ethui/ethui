import { Navbar } from "#/components/home-layout/navbar";

interface ContentLayoutProps {
  title: React.ReactNode;
  children: React.ReactNode;
}

export function ContentLayout({ title, children }: ContentLayoutProps) {
  return (
    <div>
      <Navbar title={title} />
      <div className="container">{children}</div>
    </div>
  );
}
