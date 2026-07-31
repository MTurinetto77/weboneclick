export const metadata = { title: "Gestión de Garantía Post Venta" };

const TIENDAS = [
  "Rosario Centro",
  "Alto Rosario",
  "Córdoba Shopping",
  "Solar Shopping",
  "Palermo Soho",
  "Dot Baires Shopping",
  "Envío desde el interior del país",
];

const CANALES = [
  "MercadoLibre",
  "Tienda Online (Website)",
  "Tienda Rosario Centro",
  "Tienda Alto Rosario",
  "Tienda Córdoba Shopping",
  "Tienda Solar Shopping",
  "Tienda Palermo Soho",
  "Tienda Dot Baires Shoppig",
  "Otras Plataformas",
];

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

      <form className="oc-inst-form">
        <div className="oc-inst-form-row">
          <input name="fullname" placeholder="Ingresa Nombre y Apellido" required />
          <input name="telefono" placeholder="Teléfono de Contacto" required />
        </div>

        <input name="email" type="email" placeholder="Email" required />

        <fieldset>
          <legend>Tienda en la que desea gestionar la garantía</legend>
          {TIENDAS.map((tienda) => (
            <label key={tienda}>
              <input type="radio" name="tienda" value={tienda} required />
              {tienda}
            </label>
          ))}
        </fieldset>

        <div className="oc-inst-form-row oc-inst-form-row-3">
          <input name="nrofactura" placeholder="A/B-xxxx-xxxxxxxx" required />
          <label className="oc-field-label">
            Fecha del Comprobante
            <input name="fechacomp" type="date" required />
          </label>
          <select name="canal" defaultValue="" required>
            <option value="" disabled>
              Canal de comercialización
            </option>
            {CANALES.map((canal) => (
              <option key={canal} value={canal}>
                {canal}
              </option>
            ))}
          </select>
        </div>

        <textarea name="detalle" placeholder="Detalle de la falla" rows={3} required />

        <label className="oc-field-label">
          Adjuntar Imagen/Foto del estado actual del producto
          <input name="fotos" type="file" multiple required />
        </label>

        <button type="button" className="oc-btn oc-btn-dark">
          Solicitar Garantía
        </button>
      </form>
    </div>
  );
}
