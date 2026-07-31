import type { ContactFormId } from "@/lib/contact-forms";

export type ContactSubmitStatus = "idle" | "loading" | "sent" | "error";

export async function submitContactForm(
  formId: ContactFormId,
  data: FormData | Record<string, string | string[]>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let body: BodyInit;
  let headers: HeadersInit | undefined;

  if (data instanceof FormData) {
    body = data;
  } else {
    headers = { "Content-Type": "application/json" };
    body = JSON.stringify(data);
  }

  try {
    const res = await fetch(`/api/contact/${formId}`, {
      method: "POST",
      body,
      headers,
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return { ok: false, error: json.error || "No se pudo enviar el formulario" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Error de red. Revisá tu conexión e intentá de nuevo." };
  }
}
