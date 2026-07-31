import { StaticPage } from "@/components/static-page";

const pages: Record<string, { title: string; body: string }> = {
  "bases-y-condiciones": {
    title: "Bases y Condiciones",
    body: "Las presentes bases y condiciones regulan el uso del sitio y las compras realizadas en OneClick Store.",
  },
  "politica-privacidad": {
    title: "Política de Privacidad",
    body: "OneClick protege los datos personales de sus clientes conforme a la normativa vigente en Argentina.",
  },
  "libro-de-quejas": {
    title: "Libro de Quejas",
    body: "Podés registrar tu reclamo a través de nuestros canales de atención o en cualquiera de nuestras tiendas.",
  },
  "boton-de-arrepentimiento": {
    title: "Botón de Arrepentimiento",
    body: "Si contrataste un producto o servicio a distancia, podés ejercer el derecho de arrepentimiento según la normativa aplicable.",
  },
  "gestion-de-garantia-post-venta": {
    title: "Garantía Post-Venta",
    body: "Todos los productos cuentan con garantía oficial del fabricante. Consultá los plazos y condiciones según el modelo.",
  },
  "seguimiento-de-envios": {
    title: "Seguimiento de envíos",
    body: "Ingresá el número de pedido (OCWN-XXXXX o OCW-XXXXX) que recibiste por email para conocer el estado de tu envío.",
  },
  fiscal: {
    title: "Información fiscal",
    body: "Oneclick Argentino SRL. Consultá nuestros datos fiscales y documentación impositiva en esta sección.",
  },
  "manda-tu-cv": {
    title: "Trabajá con Nosotros",
    body: "Sumate al equipo OneClick. Enviá tu CV a través del formulario de contacto indicando el área de interés.",
  },
  "cambio-facturaciones": {
    title: "Cambio de facturación",
    body: "Si necesitás modificar los datos de facturación de tu compra, contactá a nuestro equipo de atención.",
  },
  outlet: {
    title: "Outlet",
    body: "Productos con descuentos especiales, open box y oportunidades únicas.",
  },
};

export function makeStaticPage(slug: string) {
  const data = pages[slug];
  return function Page() {
    return (
      <StaticPage title={data.title}>
        <p>{data.body}</p>
      </StaticPage>
    );
  };
}
