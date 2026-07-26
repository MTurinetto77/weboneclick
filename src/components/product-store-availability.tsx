import type { StoreAvailabilityItem } from "@/lib/products";

function IconAvailable() {
  return (
    <svg
      className="oc-pdp-stock-icon oc-pdp-stock-icon--ok"
      width="20"
      height="20"
      viewBox="0 0 800 800"
      aria-hidden
    >
      <path
        fill="#008000"
        d="M768.55,244.29c-20.15-47.64-48.98-90.41-85.71-127.13-36.72-36.72-79.5-65.56-127.13-85.71C506.37,10.58,453.98,0,400,0s-106.37,10.58-155.71,31.45c-47.64,20.15-90.41,48.98-127.13,85.71-36.72,36.72-65.56,79.5-85.71,127.13C10.58,293.63,0,346.02,0,400s10.58,106.37,31.45,155.71c20.15,47.64,48.98,90.41,85.71,127.13,36.72,36.72,79.5,65.56,127.13,85.71,49.34,20.87,101.73,31.45,155.71,31.45s106.37-10.58,155.71-31.45c47.64-20.15,90.41-48.98,127.13-85.71,36.72-36.72,65.56-79.5,85.71-127.13,20.87-49.34,31.45-101.73,31.45-155.71s-10.58-106.37-31.45-155.71ZM400,720c-176.45,0-320-143.55-320-320S223.55,80,400,80s320,143.55,320,320-143.55,320-320,320Z"
      />
      <path
        fill="#008000"
        d="M491.72,291.72l-131.72,131.72-51.72-51.72c-15.62-15.62-40.95-15.62-56.57,0-15.62,15.62-15.62,40.95,0,56.57l67.31,67.31c11.3,11.3,26.13,16.94,40.97,16.94s29.68-5.65,40.97-16.94l147.31-147.31c15.62-15.62,15.62-40.95,0-56.57-15.62-15.62-40.95-15.62-56.57,0Z"
      />
    </svg>
  );
}

function IconUnavailable() {
  return (
    <svg
      className="oc-pdp-stock-icon oc-pdp-stock-icon--no"
      width="20"
      height="20"
      viewBox="0 0 800 800"
      aria-hidden
    >
      <path
        fill="#e70021"
        fillRule="evenodd"
        d="M72.73,400c0-180.75,146.53-327.27,327.27-327.27s327.27,146.53,327.27,327.27-146.52,327.27-327.27,327.27S72.73,580.75,72.73,400ZM400,0C179.09,0,0,179.09,0,400s179.09,400,400,400,400-179.09,400-400S620.91,0,400,0ZM297.15,245.72c-14.2-14.2-37.23-14.2-51.43,0-14.2,14.2-14.2,37.23,0,51.43l102.85,102.85-102.85,102.85c-14.2,14.2-14.2,37.23,0,51.43,14.2,14.2,37.23,14.2,51.43,0l102.85-102.85,102.85,102.85c14.2,14.2,37.22,14.2,51.43,0s14.2-37.22,0-51.43l-102.85-102.85,102.85-102.85c14.2-14.2,14.2-37.23,0-51.43-14.2-14.2-37.23-14.2-51.43,0l-102.85,102.85-102.85-102.85Z"
      />
    </svg>
  );
}

function StoreRow({ item }: { item: StoreAvailabilityItem }) {
  return (
    <div
      className={`oc-pdp-store-item${item.available ? " is-available" : " is-unavailable"}`}
    >
      {item.available ? <IconAvailable /> : <IconUnavailable />}
      <strong>{item.name}</strong>
    </div>
  );
}

export function ProductStoreAvailability({ items }: { items: StoreAvailabilityItem[] }) {
  const available = items.filter((i) => i.available);
  const unavailable = items.filter((i) => !i.available);

  return (
    <div className="oc-pdp-stores">
      <h4>Disponibilidad en tiendas</h4>
      <div className="oc-pdp-stores-columns">
        {available.length > 0 && (
          <div className="oc-pdp-stores-col" aria-label="Con stock">
            {available.map((item) => (
              <StoreRow key={item.name} item={item} />
            ))}
          </div>
        )}
        {unavailable.length > 0 && (
          <div className="oc-pdp-stores-col" aria-label="Sin stock">
            {unavailable.map((item) => (
              <StoreRow key={item.name} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
