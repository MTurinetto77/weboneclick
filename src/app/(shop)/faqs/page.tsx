import { FAQ_CATEGORIES } from "@/lib/faqs-data";

export const metadata = { title: "Preguntas Frecuentes" };

export default function FaqsPage() {
  return (
    <div className="container oc-inst-page oc-faqs-page">
      <header className="oc-page-header" style={{ textAlign: "center" }}>
        <h1>Centro de ayuda y preguntas frecuentes</h1>
        <p className="oc-section-lead">En OneClick estamos para ayudarte.</p>
      </header>

      <div className="oc-faqs-sections">
        {FAQ_CATEGORIES.map((cat) => (
          <section key={cat.title} className="oc-faqs-cat">
            <h2>{cat.title}</h2>
            <div className="oc-faqs-list">
              {cat.items.map((item) => (
                <details key={item.q} className="oc-faq-item">
                  <summary>{item.q}</summary>
                  <div className="oc-faq-answer">
                    <p>{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
