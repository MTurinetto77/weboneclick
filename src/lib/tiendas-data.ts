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
  },
  {
    nombre: "Cordoba Shopping",
    nombre_mapa: "Córdoba Shopping",
    slug: "cordoba-shopping",
    direccion: "Jose Antonio de Goyechea 2851, (5000) Córdoba. Piso 1, local 54",
    direccion_corta: "Piso 1, local 54",
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
  },
];

export function tiendaBySlug(slug: string) {
  return ONECLICK_TIENDAS.find((t) => t.slug === slug);
}
