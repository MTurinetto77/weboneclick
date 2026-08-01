import { ServicioTecnicoForm } from "@/components/servicio-tecnico-form";

export const metadata = { title: "Reemplazo de pantalla o batería" };

const FEATURES = [
  "Reparación express en 2 horas",
  "Piezas originales Apple",
  "Técnicos certificados por Apple",
] as const;

export default function ReemplazoPantallaBateriaPage() {
  return (
    <div className="oc-st">
      <section className="container oc-st-hero">
        <h1>Cambiá la pantalla o batería de tu iPhone en solo 2 horas</h1>
        <p>
          En OneClick, Apple Authorized Service Provider en Argentina, reparamos tu iPhone con
          técnicos certificados y repuestos originales Apple. Ya sea que necesites cambiar la
          pantalla o la batería, te ofrecemos un servicio rápido, seguro y con garantía oficial.
        </p>
        <a href="#requestst" className="oc-btn oc-btn-dark">
          Contactar Servicio Técnico OneClick
        </a>
      </section>

      <div
        className="elementor-element elementor-element-315ad2f e-flex e-con-boxed e-con e-parent"
        data-id="315ad2f"
        data-element_type="container"
        data-e-type="container"
      >
        <div className="e-con-inner">
          <div
            data-dce-background-color="#E8E8E8"
            className="elementor-element elementor-element-4bebb57 e-con-full e-flex e-con e-child"
            data-id="4bebb57"
            data-element_type="container"
            data-e-type="container"
            data-settings='{"background_background":"classic"}'
          >
            <div
              data-tooltip-id="977ab87"
              data-tooltip_settings='{"type":"text","content":"Si traés tu iPhone antes de las 16:00hs de lunes a viernes, y contamos con el repuesto en stock, se realizará el cambio de pantalla o batería el mismo día. Si lo acercás después de las 16:00hs, la reparación se completará el siguiente día hábil.","minWidth":{"desktop":0,"mobile":0,"tablet":0},"maxWidth":{"desktop":570,"mobile":null,"tablet":null},"zindex":"","target":"","anime":"fade","trigger":"hover","side":"top,bottom","arrow":true,"distance":6,"duration":350,"delay":10,"hideOn":[],"elemID":"977ab87","follow_mouse":false}'
              className="elementor-element elementor-element-977ab87 premium-global-tooltips-yes premium-global-tooltip-yes elementor-view-default elementor-position-block-start elementor-mobile-position-block-start elementor-widget elementor-widget-icon-box tooltipstered"
              data-id="977ab87"
              data-element_type="widget"
              data-e-type="widget"
              data-widget_type="icon-box.default"
              data-tooltip-content="#tooltip_content-977ab87"
            >
              <div className="elementor-icon-box-wrapper">
                <div className="elementor-icon-box-icon">
                  <span className="elementor-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" id="Capa_2-977ab87" viewBox="0 0 52.89 52.89">
                      <g id="Capa_1-2-977ab87">
                        <path
                          d="M0,26.45C0,11.84,11.84,0,26.45,0s26.45,11.84,26.45,26.45-11.84,26.45-26.45,26.45S0,41.05,0,26.45ZM49.49,26.45c0-12.74-10.31-23.04-23.04-23.04S3.43,13.71,3.43,26.45s10.28,23.02,23.02,23.02,23.04-10.28,23.04-23.02ZM10.68,27.58c0-.79.61-1.42,1.42-1.42h12.89V9.1c0-.82.63-1.42,1.42-1.42.84,0,1.48.61,1.48,1.42v18.48c0,.82-.63,1.45-1.48,1.45h-14.32c-.82,0-1.42-.63-1.42-1.45Z"
                          fill="#1d1d1f"
                        ></path>
                      </g>
                    </svg>
                  </span>
                </div>
                <div className="elementor-icon-box-content">
                  <h3 className="elementor-icon-box-title">
                    <span>Reparación express en 2 horas</span>
                  </h3>
                </div>
              </div>
              <div className="oc-tooltip" role="tooltip" id="tooltip_content-977ab87">
                Si traés tu iPhone antes de las 16:00hs de lunes a viernes, y contamos con el
                repuesto en stock, se realizará el cambio de pantalla o batería el mismo día. Si
                lo acercás después de las 16:00hs, la reparación se completará el siguiente día
                hábil.
              </div>
            </div>
          </div>
          <div
            data-dce-background-color="#E8E8E8"
            className="elementor-element elementor-element-80a740d e-con-full e-flex e-con e-child"
            data-id="80a740d"
            data-element_type="container"
            data-e-type="container"
            data-settings='{"background_background":"classic"}'
          >
            <div
              className="elementor-element elementor-element-ab0fbf5 elementor-view-default elementor-position-block-start elementor-mobile-position-block-start elementor-widget elementor-widget-icon-box"
              data-id="ab0fbf5"
              data-element_type="widget"
              data-e-type="widget"
              data-widget_type="icon-box.default"
            >
              <div className="elementor-icon-box-wrapper">
                <div className="elementor-icon-box-icon">
                  <span className="elementor-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" id="Capa_2-80a740d" viewBox="0 0 75.12 74.42">
                      <g id="Capa_1-2-80a740d">
                        <path
                          d="M4.88,51.86c4.27-4.24,8.92-5.41,16.98-10.78L3.33,22.58c-4.43-4.43-4.43-9.17-.09-13.5l4.21-4.21c4.33-4.33,9.07-4.33,13.53.09l18.94,19.06c-2.43-6.48-1.14-13.91,3.92-18.97,5.69-5.72,14.64-6.67,21.85-2.47l-3.1,3.1-5.53,5.47c-.85.85-.76,1.96.16,2.91l3.86,3.89c.92.92,1.99.85,2.85,0l5.53-5.5,3.07-3.1c4.24,7.27,3.26,16.25-2.43,21.94-5.44,5.41-13.63,6.48-20.39,3.29-1.52,1.52-2.88,2.97-4.17,4.36l14.45,14.45,2.85.44c1.14.16,2.15.85,2.81,1.83l6.61,9.87c.66.98.73,1.99.06,2.69l-5.66,5.66c-.7.7-1.68.7-2.69.03l-9.9-6.7c-.95-.63-1.68-1.64-1.83-2.78l-.44-2.85-13.82-13.78c-8.95,11.54-9.61,17.23-14.73,22.42-5.41,5.44-12.77,5.37-18.27-.06-5.47-5.5-5.53-12.9-.06-18.31ZM25.37,38.58c3.54-2.59,7.62-5.98,12.49-10.56L17.65,7.82c-2.31-2.28-4.77-2.31-7.02-.03l-4.46,4.49c-2.28,2.31-2.31,4.71,0,7.02l19.19,19.29ZM42.6,28.87C20.15,50.75,15.63,47.5,7.98,55.11c-3.48,3.51-3.54,8.22.09,11.92,3.67,3.6,8.41,3.57,11.92.03,7.62-7.59,4.36-12.11,26.24-34.56-.7-.51-1.33-1.11-1.96-1.71-.6-.63-1.17-1.27-1.68-1.93ZM10.22,17.49c-.47-.44-.44-1.2,0-1.71.47-.44,1.26-.38,1.68,0l11.82,11.83c.47.47.44,1.2,0,1.64-.44.47-1.2.47-1.68,0l-11.82-11.76ZM10.07,61.22c0-2.15,1.74-3.89,3.89-3.89s3.92,1.74,3.92,3.89-1.77,3.92-3.92,3.92-3.89-1.77-3.89-3.92ZM14.18,13.54c-.44-.44-.47-1.17,0-1.64.41-.44,1.17-.47,1.64,0l11.82,11.79c.44.44.44,1.17-.03,1.71-.41.41-1.23.47-1.68,0l-11.76-11.86ZM64.83,69.34l2.88-2.88-6.04-8.03-3.54-.6-15.59-15.55c-.63.7-1.2,1.39-1.77,2.05l15.43,15.43.63,3.54,8,6.04ZM53.7,8.95l4.62-4.65c-4.17-.63-8.47.66-11.54,3.7-5.37,5.31-5.15,14.23.47,19.85,5.66,5.6,14.51,5.85,19.85.51,3.07-3.1,4.33-7.4,3.67-11.67l-4.68,4.71c-2.21,2.24-5.22,2.18-7.56-.16l-4.68-4.65c-2.43-2.37-2.5-5.34-.16-7.65Z"
                          fill="#1d1d1f"
                        ></path>
                      </g>
                    </svg>
                  </span>
                </div>
                <div className="elementor-icon-box-content">
                  <h3 className="elementor-icon-box-title">
                    <span>Piezas originales Apple</span>
                  </h3>
                </div>
              </div>
            </div>
          </div>
          <div
            data-dce-background-color="#E8E8E8"
            className="elementor-element elementor-element-dab1afe e-con-full e-flex e-con e-child"
            data-id="dab1afe"
            data-element_type="container"
            data-e-type="container"
            data-settings='{"background_background":"classic"}'
          >
            <div
              className="elementor-element elementor-element-b52ff0c elementor-view-default elementor-position-block-start elementor-mobile-position-block-start elementor-widget elementor-widget-icon-box"
              data-id="b52ff0c"
              data-element_type="widget"
              data-e-type="widget"
              data-widget_type="icon-box.default"
            >
              <div className="elementor-icon-box-wrapper">
                <div className="elementor-icon-box-icon">
                  <span className="elementor-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" id="Capa_2-dab1afe" viewBox="0 0 41.03 58.22">
                      <g id="Capa_1-2-dab1afe">
                        <path
                          d="M20.51,0c11.26,0,20.51,9.25,20.51,20.59-.03,5.83-2.5,11.15-6.49,14.87v20.86c0,1.27-.66,1.9-1.63,1.9-.76,0-1.37-.47-2.03-1.11l-8.89-8.86c-.63-.63-1.05-.84-1.45-.84s-.82.21-1.48.84l-8.89,8.86c-.63.58-1.21,1.11-2.06,1.11-.9,0-1.58-.63-1.58-1.9l-.03-20.78C2.53,31.8,0,26.47,0,20.59,0,9.25,9.23,0,20.51,0ZM20.51,37.94c9.62,0,17.27-7.75,17.24-17.35-.03-9.62-7.62-17.35-17.24-17.35S3.3,10.97,3.3,20.59s7.59,17.32,17.22,17.35Z"
                          fill="#1d1d1f"
                        ></path>
                      </g>
                    </svg>
                  </span>
                </div>
                <div className="elementor-icon-box-content">
                  <h3 className="elementor-icon-box-title">
                    <span>Técnicos certificados por Apple</span>
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="container oc-st-value">
        <div className="oc-st-features-grid oc-st-features-grid-3">
          {FEATURES.map((title) => (
            <article key={title}>
              <p>{title}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container oc-st-form-section" id="requestst">
        <ServicioTecnicoForm />
      </section>
    </div>
  );
}
