export const metadata = { title: "Botón de Arrepentimiento" };

const STEPS = [
  {
    img: "/oneclick/pages/arrep-01.jpg",
    text: "El producto tuvo que haber sido comprado en nuestra página web: www.oneclickstore.com/ar (se excluyen las compras en Mercado Libre u otros marketplaces que cuenten con un procedimiento propio para devoluciones).",
  },
  {
    img: "/oneclick/pages/arrep-02.jpg",
    text: "Según la normativa, el plazo para solicitar la devolución es de 10 días corridos desde la fecha de entrega del producto.",
  },
  {
    img: "/oneclick/pages/arrep-03.jpg",
    text: "Una vez recibida la solicitud, se te enviará una constancia de recepción de la misma y se iniciará el procedimiento interno de verificación de la solicitud.",
  },
  {
    img: "/oneclick/pages/arrep-04.jpg",
    text: "Posteriormente, personal de nuestro equipo de posventa se contactará para comunicar el resultado de tu solicitud y, de corresponder, coordinar la devolución del producto.",
  },
  {
    img: "/oneclick/pages/arrep-05.jpg",
    text: "Para poder proceder a la devolución, el producto deberá estar en las mismas condiciones que fue entregado, con su caja original en buen estado y accesorios. No puede presentar golpes, rayaduras, roturas ni ningún otro daño, externo y/o interno, de ningún tipo. Tampoco puede haber tenido contacto con líquidos de ningún tipo tanto interna como externamente.",
  },
  {
    img: "/oneclick/pages/arrep-06.jpg",
    text: "A los fines de verificar lo mencionado en el punto anterior, se te podrá solicitar una fotografía y/o video del producto, sin perjuicio de la verificación última y necesaria que deben realizarse exclusivamente por nuestros técnicos en laboratorio (como ser, la activación de sensores de humedad internos de ciertos equipos para verificar contacto con líquidos).",
  },
  {
    img: "/oneclick/pages/arrep-07.jpg",
    text: "Todos los dispositivos de la marca Apple, deben entregarse con el Find my iPhone desactivado (Apple TV, iPad, Apple watch, iPhone, iPod, Mac).",
  },
  {
    img: "/oneclick/pages/arrep-08.jpg",
    text: (
      <>
        La devolución no tiene costo alguno de ningún tipo para el cliente, quedando en su totalidad
        a cargo de <b>OneClick.</b>
      </>
    ),
  },
];

export default function BotonDeArrepentimientoPage() {
  return (
    <div className="container oc-inst-page oc-arrep-page">
      <header className="oc-page-header">
        <h1>¿Querés devolverlo?</h1>
        <h3>No te preocupes, te la hacemos fácil.</h3>
        <p>
          Por este medio se podrá proceder a la revocación de la aceptación de productos comprados a
          través de nuestra página web (www.oneclickstore.com) en los términos de la Resolución
          424/2020 (Botón de Arrepentimiento), Art. 34 Ley 24.240 y Art. 1.110 Código Civil y
          Comercial de la Nación
        </p>
      </header>

      <section className="oc-arrep-steps-section">
        <h2>
          <b>Para proceder a la devolución,</b>
          <br />
          deberás tener en cuenta que
        </h2>

        <div className="oc-arrep-steps">
          {STEPS.map((step, i) => (
            <div className="oc-arrep-step" key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={step.img} alt="" width={150} height={120} />
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="oc-arrep-form-section">
        <h2>
          Pedidos de <b>Devolución</b>
        </h2>
        <hr className="oc-arrep-divider" />

        <form className="oc-inst-form">
          <input name="fullname" placeholder="Ingresa Nombre y Apellido" required />
          <input name="telefono" placeholder="Teléfono de Contacto" required />
          <input name="email" type="email" placeholder="Email" required />

          <fieldset>
            <legend>Motivo de Cambio</legend>
            <label>
              <input type="radio" name="tipocambio" value="Arrepentimiento de Compra" required />
              Arrepentimiento de Compra
            </label>
            <label>
              <input type="radio" name="tipocambio" value="Producto Dañado" required />
              Producto Dañado
            </label>
            <label>
              <input type="radio" name="tipocambio" value="Mal Funcionamiento" required />
              Mal Funcionamiento
            </label>
            <label>
              <input type="radio" name="tipocambio" value="Error en el Pedido" required />
              Error en el Pedido
            </label>
          </fieldset>

          <input name="nrofactura" placeholder="A/B-xxxx-xxxxxxxx" required />
          <label className="oc-field-label">
            Fecha del Comprobante
            <input name="fechacomp" type="date" required />
          </label>
          <input name="importefinal" placeholder="Importe del comprobante" required />
          <textarea name="detalles" placeholder="Detalles de la Devolución" rows={3} />

          <button type="button" className="oc-btn oc-btn-dark">
            Solicitar Devolución
          </button>
        </form>
      </section>
    </div>
  );
}
