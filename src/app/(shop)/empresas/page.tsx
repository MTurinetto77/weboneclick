import { StaticPage } from "@/components/static-page";
import Link from "next/link";

export default function EmpresasPage() {
  return (
    <StaticPage title="Empresas / Corporativos">
      <p>
        Soluciones Apple para empresas: volumen, facturación A, asesoramiento comercial y soporte
        postventa.
      </p>
      <p>
        <Link href="/contacto" className="oc-btn oc-btn-primary">
          Hablar con un asesor
        </Link>
      </p>
    </StaticPage>
  );
}
