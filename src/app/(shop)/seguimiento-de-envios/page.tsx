import { StaticPage } from "@/components/static-page";
import { SeguimientoForm } from "@/components/seguimiento-form";

export default function Page() {
  return (
    <StaticPage title="Seguimiento de envíos">
      <SeguimientoForm />
    </StaticPage>
  );
}
