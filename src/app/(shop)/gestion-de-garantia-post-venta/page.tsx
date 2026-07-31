import { GarantiaForm } from "@/components/garantia-form";

export const metadata = { title: "Gestión de Garantía Post Venta" };

export default function GestionDeGarantiaPostVentaPage() {
  return (
    <div className="container oc-inst-page oc-garantia-page">
      <header className="oc-page-header">
        <h1>
          Gestión de Garantía <b>Post Venta</b>
        </h1>
        <hr className="oc-garantia-divider" />
        <h3>Solicitar aplicación de garantía de productos</h3>
        <p>
          Completa este formulario para iniciar el proceso de aplicación de garantía de cualquiera de
          nuestros productos comprados de forma presencial u online.
        </p>
        <p>Luego de completarlo, deberá acercarse a la tienda seleccionada.</p>
        <p>
          Para los casos de envíos desde el interior del país, un asesor de atención al cliente lo
          contactará a la brevedad posible.
        </p>
      </header>

      <GarantiaForm />
    </div>
  );
}
