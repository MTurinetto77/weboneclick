export const metadata = { title: "Trabajá con Nosotros" };

export default function MandaTuCvPage() {
  return (
    <div className="container oc-inst-page oc-cv-page">
      <div className="oc-cv-grid">
        <div className="oc-cv-copy">
          <h1>¿Estás buscando un lugar donde crecer, aprender y formar parte de un gran equipo?</h1>
          <p>
            En OneClick buscamos personas apasionadas, con ganas de marcar la diferencia y crecer
            junto a nosotros. Creemos en el trabajo en equipo, en los desafíos que inspiran y en un
            ambiente donde tus ideas cuentan.
          </p>
          <p>Si querés ser parte, este es tu momento.</p>
          <a
            className="oc-btn oc-btn-dark"
            href="https://oneclick.hiringroom.com/jobs"
            target="_blank"
            rel="noreferrer"
          >
            POSTULATE AHORA
          </a>
        </div>
        <div className="oc-cv-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/oneclick/pages/manda-cv.webp" alt="Trabajá en OneClick" />
        </div>
      </div>
    </div>
  );
}
