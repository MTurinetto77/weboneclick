import { ContactHelpBlock } from "@/components/contact-help-block";

export const metadata = { title: "Contacto" };

export default function ContactoPage() {
  return (
    <div className="container oc-contacto">
      <header className="oc-contacto-hero">
        <h1>Contactate con nosotros.</h1>
        <p className="oc-contacto-sub">Estamos para ayudarte.</p>
      </header>
      <hr className="oc-contacto-rule" />
      <ContactHelpBlock />
    </div>
  );
}
