/** Menú principal espejo de oneclickstore.com */

export type NavLink = {
  label: string;
  href: string;
  /** Badge naranja encima del label (ej. "Nuevos") */
  badge?: string;
  /** product = tipografía grande; link = secundario con flecha */
  variant?: "product" | "link";
};

export type NavItem = {
  label: string;
  href: string;
  /** CTA del header del panel, ej. "Shop Apple Watch →" */
  shopLabel?: string;
  children?: NavLink[];
};

export const MAIN_NAV: NavItem[] = [
  {
    label: "Mac",
    href: "/mac",
    shopLabel: "Shop Mac →",
    children: [
      { label: "MacBook Neo", href: "/mac/macbook-neo", badge: "Nuevas", variant: "product" },
      { label: "MacBook Air", href: "/mac/macbook-air", badge: "Nuevas", variant: "product" },
      { label: "MacBook Pro", href: "/mac/macbook-pro", badge: "Nuevas", variant: "product" },
      { label: "iMac", href: "/mac/imac", variant: "product" },
      { label: "Mac mini", href: "/mac/mac-mini", variant: "product" },
      { label: "Mac Studio →", href: "/mac/mac-studio", variant: "link" },
      { label: "Displays →", href: "/mac/studio-display", variant: "link" },
      { label: "Accesorios →", href: "/accesorios", variant: "link" },
    ],
  },
  {
    label: "iPhone",
    href: "/iphone",
    shopLabel: "Shop iPhone →",
    children: [
      { label: "iPhone 17 Pro", href: "/iphone/iphone-17-pro", badge: "Nuevos", variant: "product" },
      { label: "iPhone Air", href: "/iphone/iphone-air", badge: "Nuevos", variant: "product" },
      { label: "iPhone 17", href: "/iphone/iphone-17", badge: "Nuevos", variant: "product" },
      { label: "iPhone 17e", href: "/iphone/iphone-17e", variant: "product" },
      { label: "iPhone 16", href: "/iphone/iphone-16", variant: "product" },
      { label: "iPhone 15", href: "/iphone/iphone-15", variant: "product" },
      { label: "Cargadores →", href: "/accesorios/cargadores", variant: "link" },
      { label: "Accesorios →", href: "/accesorios", variant: "link" },
    ],
  },
  {
    label: "iPad",
    href: "/ipad",
    shopLabel: "Shop iPad →",
    children: [
      { label: "iPad Pro", href: "/ipad/ipad-pro", badge: "Nuevos", variant: "product" },
      { label: "iPad Air", href: "/ipad/ipad-air", badge: "Nuevos", variant: "product" },
      { label: "iPad mini", href: "/ipad/ipad-mini", variant: "product" },
      { label: "iPad", href: "/ipad/ipad-gen", variant: "product" },
      {
        label: "Teclado, mouse y pencil →",
        href: "/accesorios/teclados-mouse-y-pencil",
        variant: "link",
      },
      { label: "Accesorios →", href: "/accesorios", variant: "link" },
    ],
  },
  {
    label: "AirPods",
    href: "/airpods",
    shopLabel: "Shop AirPods →",
    children: [
      { label: "AirPods Max", href: "/airpods/airpods-max", badge: "Nuevos", variant: "product" },
      { label: "AirPods Pro 3", href: "/airpods/airpods-pro", badge: "Nuevos", variant: "product" },
      { label: "AirPods Pro 2", href: "/airpods/airpods-pro", variant: "product" },
      { label: "AirPods 4", href: "/airpods/airpods-airpods", variant: "product" },
      {
        label: "Fundas y Cobertores →",
        href: "/accesorios/fundas-y-cobertores",
        variant: "link",
      },
      { label: "Accesorios →", href: "/accesorios", variant: "link" },
    ],
  },
  {
    label: "Apple Watch",
    href: "/watch",
    shopLabel: "Shop Apple Watch →",
    children: [
      {
        label: "Apple Watch Series",
        href: "/watch/watch-series",
        badge: "Nuevos",
        variant: "product",
      },
      { label: "Apple Watch SE", href: "/watch/watch-se", badge: "Nuevos", variant: "product" },
      {
        label: "Apple Watch Ultra",
        href: "/watch/watch-ultra",
        badge: "Nuevos",
        variant: "product",
      },
      {
        label: "Correa Apple Watch →",
        href: "/accesorios/correa-apple-watch",
        variant: "link",
      },
      { label: "Accesorios →", href: "/accesorios", variant: "link" },
    ],
  },
  { label: "Apple TV", href: "/apple-tv" },
  {
    label: "Audio",
    href: "/audio",
    shopLabel: "Shop Audio →",
    children: [
      { label: "JBL Auriculares", href: "/audio/auriculares", variant: "product" },
      { label: "JBL Parlantes", href: "/audio/parlantes", variant: "product" },
    ],
  },
  {
    label: "Accesorios",
    href: "/accesorios",
    shopLabel: "Shop Accesorios →",
    children: [
      { label: "AirTag", href: "/accesorios/airtag", variant: "product" },
      { label: "Cargadores", href: "/accesorios/cargadores", variant: "product" },
      {
        label: "Cables y Adaptadores",
        href: "/accesorios/cables-y-adaptadores",
        variant: "product",
      },
      {
        label: "Protectores de pantalla",
        href: "/accesorios/protectores-de-pantalla",
        variant: "product",
      },
      {
        label: "Teclados Mouse y Pencil",
        href: "/accesorios/teclados-mouse-y-pencil",
        variant: "product",
      },
      { label: "Bolsos y Mochilas", href: "/accesorios/bolsos-y-mochilas", variant: "product" },
      {
        label: "Fundas y Cobertores",
        href: "/accesorios/fundas-y-cobertores",
        variant: "product",
      },
      {
        label: "Correa Apple Watch",
        href: "/accesorios/correa-apple-watch",
        variant: "product",
      },
      { label: "Gaming", href: "/accesorios/gaming", variant: "product" },
      { label: "Otros", href: "/accesorios/otros", variant: "product" },
    ],
  },
  { label: "Outlet", href: "/outlet" },
  {
    label: "Promociones",
    href: "/promo",
    shopLabel: "Shop Promo →",
    children: [
      { label: "Promo! Aguinaldo", href: "/promo-aginaldo", variant: "product" },
      { label: "Descuentos! Mundial", href: "/promo/mundial", variant: "product" },
      { label: "Ofertas BOMBA", href: "/etiqueta/ofertas-bomba", variant: "product" },
      { label: "Ahorra en Outlet", href: "/outlet", variant: "link" },
      { label: "Hasta 24 cuotas →", href: "/etiqueta/hasta-24-cuotas", variant: "link" },
      { label: "Hasta 18 cuotas →", href: "/etiqueta/hasta-18-cuotas", variant: "link" },
      { label: "Hasta 12 cuotas →", href: "/etiqueta/hasta-12-cuotas", variant: "link" },
    ],
  },
  { label: "Servicio Técnico", href: "/servicio-tecnico" },
  { label: "Empresas", href: "/empresas" },
];
