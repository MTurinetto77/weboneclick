export type HomeSeccionClave = "destacados" | "fiesta" | "potencia";

export type DestacadosPestana = "apple" | "jbl" | "accesorios";

export const DESTACADOS_PESTANAS: {
  id: DestacadosPestana;
  label: string;
}[] = [
  { id: "apple", label: "Apple" },
  { id: "jbl", label: "JBL" },
  { id: "accesorios", label: "Accesorios" },
];
