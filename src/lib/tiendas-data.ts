/** Datos oficiales de sucursales OneClick (contacto / tiendas). */
export type TiendaSeed = {
  nombre: string;
  slug: string;
  direccion: string;
  direccion_corta: string;
  localidad: string;
  provincia: string;
  codigo_postal: string;
  email: string;
  telefono: string;
  orden: number;
};

export const ONECLICK_TIENDAS: TiendaSeed[] = [
  {
    nombre: "Palermo",
    slug: "palermo",
    direccion: "Honduras 4875 Capital Federal (1414), Ciudad de Buenos Aires",
    direccion_corta: "Honduras 4875 Capital Federal (1414)",
    localidad: "Ciudad de Buenos Aires",
    provincia: "CABA",
    codigo_postal: "1414",
    email: "info@oneclickstore.com",
    telefono: "0800 345 1663",
    orden: 1,
  },
  {
    nombre: "Alto Rosario Shopping",
    slug: "alto-rosario",
    direccion: "Junín 501, (2000) Rosario, Santa Fe. Local 028",
    direccion_corta: "Alto Rosario Shopping - Local 028",
    localidad: "Rosario",
    provincia: "Santa Fe",
    codigo_postal: "2000",
    email: "info@oneclickstore.com",
    telefono: "0800 345 1663",
    orden: 2,
  },
  {
    nombre: "Rosario Centro",
    slug: "rosario-centro",
    direccion: "Córdoba 1758, (2000) Rosario, Santa Fe.",
    direccion_corta: "Córdoba 1758 - Rosario",
    localidad: "Rosario",
    provincia: "Santa Fe",
    codigo_postal: "2000",
    email: "info@oneclickstore.com",
    telefono: "0800 345 1663",
    orden: 3,
  },
  {
    nombre: "Cordoba Shopping",
    slug: "cordoba-shopping",
    direccion: "Jose Antonio de Goyechea 2851, (5000) Córdoba. Piso 1, local 54",
    direccion_corta: "Piso 1, local 54",
    localidad: "Córdoba",
    provincia: "Córdoba",
    codigo_postal: "5000",
    email: "info@oneclickstore.com",
    telefono: "0800 345 1663",
    orden: 4,
  },
  {
    nombre: "Dot Baires Shopping",
    slug: "dot-baires",
    direccion: "Vedia 3600, (1430) Buenos Aires. Piso 1, local 061",
    direccion_corta: "Piso 1, local 061",
    localidad: "Buenos Aires",
    provincia: "CABA",
    codigo_postal: "1430",
    email: "info@oneclickstore.com",
    telefono: "0800 345 1663",
    orden: 5,
  },
  {
    nombre: "El Solar Shopping",
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
  },
];
