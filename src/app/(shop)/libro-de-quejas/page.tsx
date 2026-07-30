export const metadata = { title: "Libro de Quejas y Reclamos" };

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

      <form className="oc-inst-form">
        <div className="oc-inst-form-row">
          <input name="fullname" placeholder="Ingresa Nombre y Apellido" required />
          <input name="telefono" placeholder="Teléfono de Contacto" required />
        </div>

        <div className="oc-inst-form-row">
          <input name="email" type="email" placeholder="Email" required />
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

        <textarea name="detalle" placeholder="Detalle del Reclamo / Queja" rows={3} required />

        <button type="button" className="oc-btn oc-btn-dark">
          Solicitar Garantía
        </button>
      </form>
    </div>
  );
}
