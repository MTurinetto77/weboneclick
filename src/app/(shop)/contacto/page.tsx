export const metadata = { title: "Contacto" };

export default function ContactoPage() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <h2>Contacto</h2>
        <p className="section-lead">
          Escribinos a{" "}
          <a href="mailto:aukanairelibre@gmail.com">
            <strong>aukanairelibre@gmail.com</strong>
          </a>{" "}
          o completá el formulario (abre tu cliente de correo).
        </p>

        <div className="admin-card">
          <form
            action="mailto:aukanairelibre@gmail.com"
            method="get"
            encType="text/plain"
          >
            <input type="hidden" name="subject" value="Consulta desde aukanairelibre.com" />
            <div className="form-field">
              <label htmlFor="body">Mensaje</label>
              <textarea
                id="body"
                name="body"
                rows={8}
                required
                placeholder="Tu nombre, teléfono y consulta..."
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Enviar consulta
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
