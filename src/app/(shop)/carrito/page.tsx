import Link from "next/link";
import { resolveCart } from "@/lib/cart";
import { formatPrice, uploadPublicUrl } from "@/lib/utils";
import { removeFromCart, updateQuantity } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Carrito" };

export default async function CarritoPage() {
  const cart = await resolveCart();

  return (
    <section className="section">
      <div className="container">
        <h1 style={{ marginTop: 0 }}>Carrito</h1>

        {cart.items.length === 0 ? (
          <div className="admin-card">
            <p>Tu carrito está vacío.</p>
            <Link href="/catalogo" className="btn btn-primary">
              Ir al catálogo
            </Link>
          </div>
        ) : (
          <>
            {!cart.canCheckout && (
              <div className="alert">
                Algunos productos no tienen stock o precio suficiente. Ajustá las cantidades
                antes de continuar.
              </div>
            )}

            <div className="cart-table-wrap">
              <table className="cart-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.items.map((item) => (
                    <tr key={item.id_producto} className={item.disponible ? undefined : "cart-row-warn"}>
                      <td>
                        <div className="cart-product">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imagen ? uploadPublicUrl(item.imagen) : "/placeholder-product.svg"}
                            alt={item.titulo}
                          />
                          <div>
                            <Link href={`/catalogo/${item.id_producto}`}>
                              <strong>{item.titulo}</strong>
                            </Link>
                            {!item.disponible && (
                              <p className="muted" style={{ margin: 0 }}>
                                {item.stockTotal <= 0
                                  ? "Sin stock"
                                  : item.precio == null
                                    ? "Sin precio"
                                    : `Stock disponible: ${item.stockTotal}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{formatPrice(item.precio)}</td>
                      <td>
                        <form action={updateQuantity} className="qty-form">
                          <input type="hidden" name="id_producto" value={item.id_producto} />
                          <input
                            className="qty-input"
                            type="number"
                            name="cantidad"
                            min={1}
                            max={Math.max(1, item.stockTotal)}
                            defaultValue={item.cantidad}
                          />
                          <button className="btn btn-ghost" type="submit">
                            Actualizar
                          </button>
                        </form>
                      </td>
                      <td>{formatPrice(item.subtotal)}</td>
                      <td>
                        <form action={removeFromCart}>
                          <input type="hidden" name="id_producto" value={item.id_producto} />
                          <button className="btn btn-ghost" type="submit">
                            Quitar
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cart-summary">
              <p className="price" style={{ fontSize: "1.4rem", margin: 0 }}>
                Total: {formatPrice(cart.subtotal)}
              </p>
              <div className="actions">
                <Link href="/catalogo" className="btn btn-secondary">
                  Seguir comprando
                </Link>
                {cart.canCheckout ? (
                  <Link href="/checkout" className="btn btn-primary">
                    Finalizar compra
                  </Link>
                ) : (
                  <button className="btn btn-primary" type="button" disabled>
                    Finalizar compra
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
