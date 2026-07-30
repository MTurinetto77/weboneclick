import { ONECLICK_TIENDAS } from "@/lib/tiendas-data";
import TiendasExplorer from "@/components/tiendas-explorer";

export const metadata = { title: "Tiendas" };

export default function TiendasPage() {
  const tiendas = [...ONECLICK_TIENDAS].sort((a, b) => a.orden_mapa - b.orden_mapa);

  return (
    <div className="oc-tiendas-page">
      <TiendasExplorer tiendas={tiendas} />
    </div>
  );
}
