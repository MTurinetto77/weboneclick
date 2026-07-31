import { LibroQuejasForm } from "@/components/libro-quejas-form";

export const metadata = { title: "Libro de Quejas y Reclamos" };

export default function LibroDeQuejasPage() {
  return (
    <div className="container oc-inst-page oc-quejas-page">
      <header className="oc-page-header">
        <h1>
          Libro de <b>Quejas y Reclamos</b>
        </h1>
        <hr className="oc-quejas-divider" />
        <h3>Completa este formulario para dar inicio al reclamo</h3>
      </header>

      <LibroQuejasForm />
    </div>
  );
}
