import Link from "next/link";

export function StaticPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container oc-static-page">
      <nav className="oc-breadcrumb">
        <Link href="/">Inicio</Link>
        <span>/</span>
        <span>{title}</span>
      </nav>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
