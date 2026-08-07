import Link from "next/link";
import type { Metadata } from "next";
import { Iphone17VariantPdp } from "@/components/demo/iphone-17-variant-pdp";

export const metadata: Metadata = {
  title: "Demo iPhone 17 · Variantes | OneClick",
  description:
    "Demostración hardcodeada de PDP con variantes de capacidad, color y cuotas para iPhone 17.",
  robots: { index: false, follow: false },
};

export default function DemoIphone17Page() {
  return (
    <div className="container oc-pdp">
      <div className="oc-page-header">
        <nav className="oc-breadcrumb">
          <Link href="/">Inicio</Link>
          <span>/</span>
          <Link href="/iphone">iPhone</Link>
          <span>/</span>
          <Link href="/iphone/iphone-17">iPhone 17</Link>
          <span>/</span>
          <span>Demo variantes</span>
        </nav>
      </div>

      <Iphone17VariantPdp />

      <section className="oc-pdp-description oc-demo-pdp-note">
        <h2>Acerca de esta demo</h2>
        <p>
          Página de demostración hardcodeada. Los selectores de Capacidad, Color y Cuotas
          actualizan fotos y precios sin persistir en carrito ni Odoo. La categoría real
          sigue en{" "}
          <Link href="/iphone/iphone-17">/iphone/iphone-17</Link>.
        </p>
      </section>
    </div>
  );
}
