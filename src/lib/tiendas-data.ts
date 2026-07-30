/** Datos oficiales de sucursales OneClick (contacto / tiendas). */
export type TiendaSeed = {
  nombre: string;
  /** Nombre en listado de /tiendas (mapa) */
  nombre_mapa: string;
  slug: string;
  direccion: string;
  direccion_corta: string;
  localidad: string;
  provincia: string;
  codigo_postal: string;
  email: string;
  telefono: string;
  orden: number;
  /** Orden en página /tiendas */
  orden_mapa: number;
  imagen: string;
  latitud: number;
  longitud: number;
  /** Líneas de horario de ventas, ej: ["Lunes a Sábados de 10:00 a 19:00 hs"] */
  horario_ventas: string[];
  /** Líneas de horario de servicio técnico */
  horario_servicio_tecnico: string[];
};

export const ONECLICK_TIENDAS: TiendaSeed[] = [
  {
    nombre: "Palermo",
    nombre_mapa: "Palermo Soho",
    slug: "palermo",
    direccion: "Honduras 4875 Capital Federal (1414), Ciudad de Buenos Aires",
    direccion_corta: "Honduras 4875 Capital Federal (1414)",
    localidad: "Ciudad de Buenos Aires",
    provincia: "CABA",
    codigo_postal: "1414",
    email: "info@oneclickstore.com",
    telefono: "0800 345 1663",
    orden: 1,
    orden_mapa: 1,
    imagen: "/oneclick/tiendas/palermo.jpeg",
    latitud: -34.5889,
    longitud: -58.4255,
    horario_ventas: ["Lunes a Sábados de 10:00 a 19:00 hs"],
    horario_servicio_tecnico: ["Lunes a Sábados de 10:00 a 19:00 hs"],
  },
  {
    nombre: "El Solar Shopping",
    nombre_mapa: "El Solar Shopping",
    slug: "el-solar",
    direccion:
      "Av. Luis María Campos 901, (1426) Ciudad de Buenos Aires. Nivel Arce, local 011",
    direccion_corta: "Nivel Arce, local 011",
    localidad: "Ciudad de Buenos Aires",
    provincia: "CABA",
    codigo_postal: "1426",
    email: "info@oneclickstore.com",
    telefono: "0800 345 1663",
    orden: 6,
    orden_mapa: 2,
    imagen: "/oneclick/tiendas/el-solar.jpg",
    latitud: -34.5745,
    longitud: -58.4105,
    horario_ventas: ["Lunes a Domingo de 10:00 a 21:00 hs"],
    horario_servicio_tecnico: ["Lunes a Viernes de 10:00 a 19:00 hs"],
  },
  {
    nombre: "Rosario Centro",
    nombre_mapa: "Rosario Centro",
    slug: "rosario-centro",
    direccion: "Córdoba 1758, (2000) Rosario, Santa Fe.",
    direccion_corta: "Córdoba 1758 - Rosario",
    localidad: "Rosario",
    provincia: "Santa Fe",
    codigo_postal: "2000",
    email: "info@oneclickstore.com",
    telefono: "0800 345 1663",
    orden: 3,
    orden_mapa: 3,
    imagen: "/oneclick/tiendas/rosario-centro.jpeg",
    latitud: -32.9442,
    longitud: -60.6505,
    horario_ventas: [
      "Lunes a Viernes de 9:00 a 19:00 hs",
      "Sábados de 9:00 a 14:00 hs",
    ],
    horario_servicio_tecnico: [
      "Lunes a Viernes de 9:00 a 18:00 hs",
      "Sábados de 9:00 a 14:00 hs",
    ],
  },
  {
    nombre: "Alto Rosario Shopping",
    nombre_mapa: "Alto Rosario Shopping",
    slug: "alto-rosario",
    direccion: "Junín 501, (2000) Rosario, Santa Fe. Local 028",
    direccion_corta: "Alto Rosario Shopping - Local 028",
    localidad: "Rosario",
    provincia: "Santa Fe",
    codigo_postal: "2000",
    email: "info@oneclickstore.com",
    telefono: "0800 345 1663",
    orden: 2,
    orden_mapa: 4,
    imagen: "/oneclick/tiendas/alto-rosario.jpeg",
    latitud: -32.9267,
    longitud: -60.6775,
    horario_ventas: ["Lunes a Domingo de 10:00 a 21:00 hs"],
    horario_servicio_tecnico: [
      "Lunes a Viernes de 10:00 a 19:00 hs",
      "Sábados de 10:00 a 15:00 hs",
    ],
  },
  {
    nombre: "Cordoba Shopping",
    nombre_mapa: "Córdoba Shopping",
    slug: "cordoba-shopping",
    direccion: "Jose Antonio de Goyechea 2851, (5000) Córdoba. Piso 1, local 55",
    direccion_corta: "Piso 1, local 55",
    localidad: "Córdoba",
    provincia: "Córdoba",
    codigo_postal: "5000",
    email: "info@oneclickstore.com",
    telefono: "0800 345 1663",
    orden: 4,
    orden_mapa: 5,
    imagen: "/oneclick/tiendas/cordoba.jpeg",
    latitud: -31.365,
    longitud: -64.175,
    horario_ventas: ["Lunes a Domingo de 10:00 a 22:00 hs"],
    horario_servicio_tecnico: ["Lunes a Sábados de 10:00 a 19:00 hs"],
  },
  {
    nombre: "Dot Baires Shopping",
    nombre_mapa: "Dot Baires Shopping",
    slug: "dot-baires",
    direccion: "Vedia 3600, (1430) Buenos Aires. Piso 1, local 061",
    direccion_corta: "Piso 1, local 061",
    localidad: "Buenos Aires",
    provincia: "CABA",
    codigo_postal: "1430",
    email: "info@oneclickstore.com",
    telefono: "0800 345 1663",
    orden: 5,
    orden_mapa: 6,
    imagen: "/oneclick/tiendas/dot.jpeg",
    latitud: -34.547,
    longitud: -58.488,
    horario_ventas: ["Lunes a Domingo de 10:00 a 22:00 hs"],
    horario_servicio_tecnico: ["Lunes a Sábados de 10:00 a 19:00 hs"],
  },
];

export function tiendaBySlug(slug: string) {
  return ONECLICK_TIENDAS.find((t) => t.slug === slug);
}
