import { SiteFooter, SiteHeader } from "@/components/site-chrome";

/** Evita prerender en build (Hostinger no tiene DB accesible en compile). */
export const dynamic = "force-dynamic";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div id="top" />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
