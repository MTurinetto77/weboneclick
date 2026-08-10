/** FAQs oficiales oneclickstore.com/faqs */
export type FaqItem = { q: string; a: string };
export type FaqCategory = { title: string; items: FaqItem[] };

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    title: "Pagos y financiación",
    items: [
      {
        q: "¿Qué medios de pago aceptan?",
        a: "Aceptamos todos los medios de pago disponibles en MercadoPago: tarjetas de crédito, tarjetas de débito, Mercado Crédito, transferencia bancaria y pago contado. La financiación es gestionada por Mercado Pago según sus políticas. Aceptamos MODO (según promociones vigentes).",
      },
      {
        q: "¿Cuántas cuotas sin interés ofrecen?",
        a: "Ofrecemos 3, 6, 9, 12 y hasta 18 cuotas sin interés, según el producto. La cantidad de cuotas disponible se encuentra indicada en la página de cada producto.",
      },
      {
        q: "¿Las cuotas aplican con todas las tarjetas?",
        a: "Las cuotas aplican con todas las tarjetas habilitadas por Mercado Pago. La disponibilidad puede variar según el banco, la tarjeta y las promociones vigentes.",
      },
      {
        q: "¿Aceptan transferencia?",
        a: "Sí, aceptamos transferencia bancaria. El pedido se confirma una vez acreditado el pago.",
      },
      {
        q: "¿Se puede pagar con Wayni?",
        a: "Sí, aceptamos Wayni como medio de pago en nuestras tiendas físicas.",
      },
    ],
  },
  {
    title: "Envíos",
    items: [
      {
        q: "¿Hacen envíos a todo el país?",
        a: "Sí. Realizamos envíos a todo Argentina a través de operadores logísticos.",
      },
      {
        q: "¿Cuánto demora el envío?",
        a: "El tiempo depende de la localidad: AMBA entre 24 y 72 hs hábiles; Interior del país entre 2 y 7 días hábiles aprox. El plazo exacto se informa al finalizar la compra y en el mail de confirmación.",
      },
      {
        q: "¿Ofrecen envío en el día?",
        a: "Sí. Contamos con opción Same Day en zonas habilitadas. Comprando antes de las 12 hs → entrega entre 17 y 21 hs del mismo día. Comprando después → entrega el siguiente día hábil. Este servicio aplica solo a códigos postales específicos.",
      },
      {
        q: "¿Cómo puedo hacer seguimiento de mi pedido?",
        a: "Ingresá tu número de pedido (OCWN-XXXXX o OCW-XXXXX) en la página de Seguimiento de envíos. Ahí vas a ver el estado actual y el historial del envío. Si no aparece información, contactá a atención al cliente.",
      },
      {
        q: "¿Cuánto cuesta el envío?",
        a: "Gratis en compras superiores a $200.000. En compras menores, el costo se calcula automáticamente en el checkout según tu dirección.",
      },
    ],
  },
  {
    title: "Retiro en tienda",
    items: [
      {
        q: "¿Puedo comprar online y retirar en tienda?",
        a: "Sí. Podés elegir Retiro en tienda sin costo al finalizar la compra.",
      },
      {
        q: "¿Cuánto tarda en estar disponible?",
        a: "Al confirmarse el pago, el pedido queda listo para retirar. En el mail de confirmación te indicamos la tienda y su horario de atención.",
      },
      {
        q: "¿Puede retirar otra persona?",
        a: "Sí. Debe presentarse con DNI, número de pedido y autorización del titular (puede realizarse al momento de la compra en la web o previamente coordinada con nuestro equipo de atención al cliente por WhatsApp).",
      },
    ],
  },
  {
    title: "Cambios y garantías",
    items: [
      {
        q: "¿Cuál es la política de cambios?",
        a: "Podés solicitar cambio dentro de los 10 días desde la recepción si el producto está sin uso, en su caja original y con todos sus accesorios.",
      },
      {
        q: "¿Cuánto dura la garantía?",
        a: "Todos los productos cuentan con garantía oficial del fabricante. Para gestionar garantía puede solicitarse la factura y el equipo será evaluado por servicio técnico autorizado.",
      },
      {
        q: "¿Los productos son originales?",
        a: "Sí. Comercializamos productos 100% originales.",
      },
      {
        q: "¿Somos Apple Authorized Reseller?",
        a: "Sí. OneClick es Apple Authorized Reseller en Argentina.",
      },
    ],
  },
  {
    title: "Productos Apple",
    items: [
      {
        q: "¿Los iPhone son liberados?",
        a: "Sí. Todos los iPhone son liberados de fábrica para usar con cualquier compañía.",
      },
      {
        q: "¿Incluyen cargador?",
        a: "Depende del modelo. Apple actualmente no incluye cargador en varios productos (como iPhone), solo cable USB-C o Lightning.",
      },
      {
        q: "¿Tienen garantía oficial Apple?",
        a: "Sí. Todos los productos Apple cuentan con garantía oficial Apple de 1 año desde la activación del equipo, con cobertura internacional.",
      },
    ],
  },
];
