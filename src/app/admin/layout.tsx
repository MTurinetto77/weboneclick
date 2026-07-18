import Link from "next/link";
import { auth, signOut } from "@/auth";

/** Evita prerender en build sin credenciales de DB. */
export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/ventas", label: "Ventas" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/marcas", label: "Marcas" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/tiendas", label: "Tiendas" },
  { href: "/admin/constancias", label: "Constancias fiscales" },
  { href: "/admin/exclusiones", label: "Exclusiones retenciones" },
  { href: "/admin/beneficios", label: "Beneficios" },
  { href: "/admin/almacenes", label: "Almacenes" },
  { href: "/admin/caracteristicas", label: "Características" },
  { href: "/admin/usuarios", label: "Usuarios" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session || session.user.role !== "admin") {
    return <>{children}</>;
  }

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <div className="brand" style={{ color: "#fff", marginBottom: "1.25rem" }}>
          OneClick Admin
          <span style={{ color: "rgba(255,255,255,0.7)" }}>Panel</span>
        </div>
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        <div style={{ marginTop: "2rem", fontSize: "0.85rem", opacity: 0.85 }}>
          {session.user.email}
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/admin/login" });
          }}
          style={{ marginTop: "0.75rem" }}
        >
          <button
            type="submit"
            className="btn btn-ghost"
            style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
          >
            Salir
          </button>
        </form>
        <Link href="/" style={{ marginTop: "1rem", opacity: 0.8 }}>
          Ver sitio
        </Link>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
