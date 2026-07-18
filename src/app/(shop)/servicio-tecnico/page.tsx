import { StaticPage } from "@/components/static-page";
import Link from "next/link";

export default function ServicioTecnicoPage() {
  return (
    <StaticPage title="Servicio Técnico">
      <p>
        Contamos con Servicio Técnico Autorizado Apple. Si tenés un problema con tu equipo,
        contactanos para agendar una revisión.
      </p>
      <p>
        <Link href="/contacto" className="oc-btn oc-btn-primary">
          Contactate
        </Link>
      </p>
    </StaticPage>
  );
}
