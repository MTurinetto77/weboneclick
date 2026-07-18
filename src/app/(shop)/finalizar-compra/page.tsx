import { redirect } from "next/navigation";

export default function FinalizarCompraRedirect() {
  redirect("/checkout");
}
