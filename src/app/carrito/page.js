"use client";

import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useSucursal } from "../context/SucursalContext";
import { db } from "../lib/firebase";

import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import Swal from "sweetalert2";


const CarritoPage = () => {
  const {
    carrito,
    actualizarCantidad,
    eliminarProducto,
    vaciarCarrito,
  } = useCart();

  const { sucursal } = useSucursal();

  const [metodoEntrega, setMetodoEntrega] =
    useState("local");

  const [direccion, setDireccion] =
    useState("");

  const [nombre, setNombre] =
    useState("");

  const [telefono, setTelefono] =
    useState("");

  const [observaciones, setObservaciones] =
    useState("");

  const [metodoPago, setMetodoPago] =
    useState("efectivo");

  const [enviando, setEnviando] =
    useState(false);


  /* ======================================================
     SIN SUCURSAL
  ====================================================== */

  if (!sucursal) {
    return (
      <div className="min-h-screen bg-[#1B120D] text-white flex items-center justify-center p-6">
        Primero elegí una sucursal.
      </div>
    );
  }


  /* ======================================================
     TOTALES
  ====================================================== */

  const precioDelivery =
    Number(
      sucursal.precioDelivery ||
      0
    );


  const subtotalCarrito =
    carrito.reduce(
      (total, producto) => {
        const cantidad =
          Number(
            producto.cantidad ||
            0
          );

        const precio =
          Number(
            producto.precio ||
            0
          );

        return (
          total +
          precio * cantidad
        );
      },
      0
    );


  const totalConDelivery =
    metodoEntrega ===
    "delivery"
      ? subtotalCarrito +
        precioDelivery
      : subtotalCarrito;


  /* ======================================================
     FORMATEAR DINERO
  ====================================================== */

  const dinero = (valor) =>
    Number(
      valor || 0
    ).toLocaleString(
      "es-AR",
      {
        maximumFractionDigits: 0,
      }
    );


  /* ======================================================
     DESCONTAR STOCK + GUARDAR PEDIDO
  ====================================================== */

  const guardarPedidoFirebase =
    async () => {

      const itemsValidos =
        carrito.map(
          (item) => ({
            ...item,

            cantidad:
              Number(
                item.cantidad ||
                0
              ),
          })
        );


      const pedidoId =
        `WEB-${Date.now()}`;


      await runTransaction(
        db,

        async (
          transaction
        ) => {

          const lecturas =
            [];


          /* ================================================
             1. LEER TODOS LOS PRODUCTOS
          ================================================= */

          for (
            const item
            of itemsValidos
          ) {

            const productoRef =
              doc(
                db,
                "sucursales",
                sucursal.id,
                "productos",
                item.id
              );


            const snapshot =
              await transaction.get(
                productoRef
              );


            if (
              !snapshot.exists()
            ) {
              throw new Error(
                `El producto "${
                  item.Nombre ||
                  item.nombre ||
                  item.id
                }" ya no existe.`
              );
            }


            const datos =
              snapshot.data();


            const stockActual =
              Number(
                datos.stock ||
                0
              );


            const cantidad =
              Number(
                item.cantidad ||
                0
              );


            if (
              !Number.isFinite(
                cantidad
              ) ||
              cantidad <= 0
            ) {
              throw new Error(
                "Hay un producto con cantidad inválida."
              );
            }


            if (
              stockActual <
              cantidad
            ) {
              throw new Error(
                `No hay stock suficiente de ${
                  datos.Nombre ||
                  item.Nombre ||
                  item.nombre ||
                  "este producto"
                }.

Disponible: ${stockActual}
Pedido: ${cantidad}`
              );
            }


            lecturas.push({
              item,
              productoRef,
              datos,
              cantidad,
              stockActual,
              stockNuevo:
                stockActual -
                cantidad,
            });

          }


          /* ================================================
             2. DESCONTAR STOCK
          ================================================= */

          for (
            const lectura
            of lecturas
          ) {

            transaction.update(
              lectura.productoRef,

              {
                stock:
                  lectura.stockNuevo,

                actualizadoEn:
                  serverTimestamp(),
              }
            );


            /* ==============================================
               MOVIMIENTO DE STOCK
            =============================================== */

            const movimientoRef =
              doc(
                collection(
                  db,
                  "movimientosStock"
                )
              );


            transaction.set(
              movimientoRef,

              {
                pedidoId,

                origen:
                  "web",

                tipo:
                  "venta_web",

                sucursalId:
                  sucursal.id,

                sucursalNombre:
                  sucursal.nombre,

                productoId:
                  lectura.item.id,

                producto:
                  lectura.datos.Nombre ||
                  lectura.item.Nombre ||
                  lectura.item.nombre ||
                  "Producto",

                categoria:
                  lectura.datos.categoria ||
                  lectura.item.categoria ||
                  "",

                cantidad:
                  -lectura.cantidad,

                diferencia:
                  -lectura.cantidad,

                stockAnterior:
                  lectura.stockActual,

                stockNuevo:
                  lectura.stockNuevo,

                precioUnitario:
                  Number(
                    lectura.item.precio ||
                    0
                  ),

                fecha:
                  serverTimestamp(),
              }
            );

          }


          /* ================================================
             3. ITEMS NORMALIZADOS
          ================================================= */

          const itemsPedido =
            itemsValidos.map(
              (item) => {

                const precio =
                  Number(
                    item.precio ||
                    0
                  );

                const cantidad =
                  Number(
                    item.cantidad ||
                    0
                  );


                return {
                  productoId:
                    item.id,

                  nombre:
                    item.Nombre ||
                    item.nombre ||
                    "Producto",

                  categoria:
                    item.categoria ||
                    "",

                  cantidad,

                  precio,

                  subtotal:
                    precio *
                    cantidad,
                };

              }
            );


          /* ================================================
             4. GUARDAR PEDIDO WEB
          ================================================= */

          const pedidoWebRef =
            doc(
              db,
              "pedidosWeb",
              pedidoId
            );


          transaction.set(
            pedidoWebRef,

            {
              id:
                pedidoId,

              pedidoId,

              origen:
                "web",

              sucursalId:
                sucursal.id,

              sucursalNombre:
                sucursal.nombre,

              items:
                itemsPedido,

              subtotal:
                Number(
                  subtotalCarrito
                ),

              delivery:
                metodoEntrega ===
                "delivery"
                  ? precioDelivery
                  : 0,

              total:
                Number(
                  totalConDelivery
                ),

              metodoEntrega,

              nombre:
                nombre.trim(),

              cliente:
                nombre.trim(),

              telefono:
                telefono.trim(),

              direccion:
                metodoEntrega ===
                "delivery"
                  ? direccion.trim()
                  : "",

              observaciones:
                observaciones.trim(),

              metodoPago,

              estado:
                "Pendiente",

              timestamp:
                Date.now(),

              fecha:
                serverTimestamp(),

              fechaCreacion:
                serverTimestamp(),

              fechaActualizacion:
                serverTimestamp(),
            }
          );


          /* ================================================
             5. SI ES DELIVERY → APP DEL REPARTIDOR
          ================================================= */

          if (
            metodoEntrega ===
            "delivery"
          ) {

            const deliveryRef =
              doc(
                db,
                "pedidosDelivery",
                pedidoId
              );


            transaction.set(
              deliveryRef,

              {
                id:
                  pedidoId,

                pedidoWebId:
                  pedidoId,

                origen:
                  "web",

                tipo:
                  "delivery",

                /* ==========================================
                   SUCURSAL
                ========================================== */

                sucursalId:
                  sucursal.id,

                sucursalNombre:
                  sucursal.nombre,

                /* ==========================================
                   CLIENTE
                ========================================== */

                cliente:
                  nombre.trim(),

                nombre:
                  nombre.trim(),

                telefono:
                  telefono.trim(),

                direccion:
                  direccion.trim(),

                /* ==========================================
                   PRODUCTOS
                ========================================== */

                items:
                  itemsPedido,

                subtotal:
                  Number(
                    subtotalCarrito
                  ),

                costoDelivery:
                  Number(
                    precioDelivery
                  ),

                delivery:
                  Number(
                    precioDelivery
                  ),

                total:
                  Number(
                    totalConDelivery
                  ),

                /* ==========================================
                   PAGO
                ========================================== */

                metodoPago,

                /* ==========================================
                   ENTREGA
                ========================================== */

                observaciones:
                  observaciones.trim(),

                hora:
                  "",

                /* ==========================================
                   ESTADO
                ========================================== */

                estado:
                  "Pendiente",

                repartidorId:
                  "",

                repartidorNombre:
                  "",

                /* ==========================================
                   FECHAS
                ========================================== */

                timestamp:
                  Date.now(),

                fecha:
                  serverTimestamp(),

                fechaCreacion:
                  serverTimestamp(),

                fechaActualizacion:
                  serverTimestamp(),
              }
            );

          }

        }
      );


      return pedidoId;
    };


  /* ======================================================
     CONFIRMAR PEDIDO
  ====================================================== */

  const handleEnviarPedido =
    async () => {

      if (enviando) {
        return;
      }


      /* ================================================
         SUCURSAL ABIERTA
      ================================================= */

      if (
        !sucursal.abierto
      ) {
        Swal.fire({
          icon:
            "info",

          title:
            "Sucursal cerrada",

          text:
            sucursal.mensajeCerrado ||
            "En este momento no estamos tomando pedidos.",

          confirmButtonColor:
            "#7A4E35",
        });

        return;
      }


      /* ================================================
         CARRITO
      ================================================= */

      if (
        carrito.length ===
        0
      ) {
        Swal.fire({
          icon:
            "error",

          title:
            "Carrito vacío",
        });

        return;
      }


      /* ================================================
         NOMBRE
      ================================================= */

      if (
        !nombre.trim()
      ) {
        Swal.fire({
          icon:
            "error",

          title:
            "Ingresá tu nombre",
        });

        return;
      }


      /* ================================================
         TELÉFONO
      ================================================= */

      if (
        !telefono.trim()
      ) {
        Swal.fire({
          icon:
            "error",

          title:
            "Ingresá tu teléfono",

          text:
            "Lo necesitamos por si tenemos que comunicarnos con vos.",
        });

        return;
      }


      /* ================================================
         DIRECCIÓN DELIVERY
      ================================================= */

      if (
        metodoEntrega ===
          "delivery" &&
        !direccion.trim()
      ) {
        Swal.fire({
          icon:
            "error",

          title:
            "Ingresá la dirección",
        });

        return;
      }


      setEnviando(
        true
      );


      try {

        /* ==============================================
           FIREBASE
        =============================================== */

        const pedidoId =
          await guardarPedidoFirebase();


        /* ==============================================
           DETALLE WHATSAPP
        =============================================== */

        const detalles =
          carrito
            .map(
              (item) => {

                const cantidad =
                  Number(
                    item.cantidad ||
                    0
                  );

                const precio =
                  Number(
                    item.precio ||
                    0
                  );

                const subtotal =
                  cantidad *
                  precio;


                return `${
                  item.Nombre ||
                  item.nombre ||
                  "Producto"
                } x ${cantidad} = $${dinero(
                  subtotal
                )}`;

              }
            )
            .join(
              "\n"
            );


        /* ==============================================
   MENSAJE WHATSAPP
============================================== */

const mensaje = `Hola! Quiero hacer un pedido en Pizzería Jope - ${sucursal.nombre}:

Pedido: ${pedidoId}

Cliente: ${nombre.trim()}
Teléfono: ${telefono.trim()}

${detalles}

Subtotal: $${dinero(subtotalCarrito)}
${
  metodoEntrega === "delivery"
    ? `Delivery: $${dinero(precioDelivery)}`
    : ""
}

TOTAL: $${dinero(totalConDelivery)}

Entrega: ${
  metodoEntrega === "delivery"
    ? `Delivery a ${direccion.trim()}`
    : "Retiro en local"
}

Pago: ${
  metodoPago === "efectivo"
    ? "Efectivo"
    : `Transferencia - Alias: ${sucursal.alias || "-"}`
}

${
  observaciones.trim()
    ? `Observaciones: ${observaciones.trim()}`
    : ""
}`;


/* ==============================================
   WHATSAPP DE LA SUCURSAL
============================================== */

let numeroWhatsApp = String(
  sucursal.whatsapp || ""
).replace(/\D/g, "");

/*
   Si está guardado como número argentino sin
   código de país, agregamos 54.
*/
if (
  numeroWhatsApp.length === 10 &&
  numeroWhatsApp.startsWith("9")
) {
  numeroWhatsApp = `54${numeroWhatsApp}`;
}

if (
  numeroWhatsApp.length === 10
) {
  numeroWhatsApp = `549${numeroWhatsApp}`;
}

if (!numeroWhatsApp) {
  throw new Error(
    "La sucursal no tiene un número de WhatsApp configurado."
  );
}


const url =
  `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(
    mensaje
  )}`;


/* ==============================================
   LIMPIAR CARRITO
============================================== */

vaciarCarrito();


/* ==============================================
   CONFIRMACIÓN
============================================== */

await Swal.fire({
  icon: "success",

  title: "Pedido confirmado",

  html:
    metodoEntrega === "delivery"
      ? `
          <b>¡Listo!</b><br><br>
          Tu pedido fue enviado al local y al repartidor.
        `
      : `
          <b>¡Listo!</b><br><br>
          Tu pedido quedó registrado para retirar en el local, por favor confirmar por whatsapp.
        `,

  timer: 1800,

  showConfirmButton: false,
});


/* ==============================================
   ABRIR WHATSAPP
============================================== */

window.location.href = url;


        window.open(
          url,
          "_blank"
        );

      } catch (error) {

        console.error(
          "Error confirmando pedido:",
          error
        );


        Swal.fire({
          icon:
            "error",

          title:
            "No pudimos confirmar el pedido",

          text:
            error?.message ||
            "Revisá el stock y volvé a intentar.",
        });

      } finally {

        setEnviando(
          false
        );

      }

    };


  /* ======================================================
     PANTALLA
  ====================================================== */

  return (
    <div className="min-h-screen bg-[#1B120D] p-5 md:p-8">


      <div className="max-w-5xl mx-auto">


        {/* =================================================
            HEADER
        ================================================= */}

        <div className="text-center mb-8 text-white">

          <p className="text-[#E7C873] uppercase tracking-[0.25em] text-xs font-black">
            Pizzería Jope
          </p>


          <h1 className="text-4xl font-black mt-2">
            Tu pedido
          </h1>


          <p className="text-[#E7C873] mt-2">
            {sucursal.nombre}
          </p>


          {!sucursal.abierto && (

            <div className="mt-5 bg-red-600/20 border border-red-500 rounded-2xl p-4 max-w-xl mx-auto">

              <p className="font-black text-red-300">
                En este momento no estamos tomando pedidos
              </p>


              <p className="text-white/80 mt-1">
                {
                  sucursal.mensajeCerrado
                }
              </p>

            </div>

          )}

        </div>


        {/* =================================================
            CARRITO VACÍO
        ================================================= */}

        {carrito.length ===
        0 ? (

          <div className="bg-[#F8F5EF] rounded-3xl p-10 text-center">

            <div className="text-5xl">
              🛒
            </div>

            <p className="font-black text-xl mt-4 text-[#7A4E35]">
              El carrito está vacío
            </p>

            <p className="text-gray-500 mt-2">
              Agregá productos para realizar tu pedido.
            </p>

          </div>

        ) : (

          <div className="space-y-5">


            {/* =================================================
                PRODUCTOS
            ================================================= */}

            {carrito.map(
              (
                producto
              ) => {

                const cantidad =
                  Number(
                    producto.cantidad ||
                    0
                  );


                const categoria =
                  String(
                    producto.categoria ||
                    ""
                  ).toLowerCase();


                /* =============================================
                   PIZZAS:
                   0.5 → 1 → 1.5

                   EMPANADAS:
                   mínimo 3
                   3 → 4 → 5 → 6...

                   RESTO:
                   1 → 2 → 3
                ============================================= */

                const paso =
                  categoria ===
                  "pizzas"
                    ? 0.5
                    : 1;


                const minimo =
                  categoria ===
                  "pizzas"
                    ? 0.5

                    : categoria ===
                      "empanadas"
                    ? 3

                    : 1;


                const subtotal =
                  Number(
                    producto.precio ||
                    0
                  ) *
                  cantidad;


                return (

                  <div
                    key={
                      producto.id
                    }
                    className="bg-[#F8F5EF] rounded-3xl p-5 shadow-xl"
                  >

                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">


                      <div>

                        <h2 className="text-xl font-black text-[#7A4E35]">
                          {
                            producto.Nombre ||
                            producto.nombre
                          }
                        </h2>


                        <p className="text-gray-600 mt-1">
                          ${dinero(
                            producto.precio
                          )} ×{" "}
                          {cantidad}
                        </p>

                      </div>


                      <p className="font-black text-xl text-[#2F6B4F]">
                        $
                        {dinero(
                          subtotal
                        )}
                      </p>

                    </div>


                    <div className="flex gap-3 mt-4 items-center">


                      {/* RESTAR */}

                      <button
                        type="button"

                        onClick={() =>
                          actualizarCantidad(
                            producto.id,

                            Math.max(
                              cantidad -
                                paso,

                              minimo
                            )
                          )
                        }

                        className="bg-[#7A4E35] text-white w-11 h-11 rounded-full font-black text-xl"
                      >
                        −
                      </button>


                      <strong className="text-xl min-w-[45px] text-center">
                        {cantidad}
                      </strong>


                      {/* SUMAR */}

                      <button
                        type="button"

                        onClick={() =>
                          actualizarCantidad(
                            producto.id,

                            cantidad +
                              paso
                          )
                        }

                        className="bg-[#2F6B4F] text-white w-11 h-11 rounded-full font-black text-xl"
                      >
                        +
                      </button>


                      <button
                        type="button"

                        onClick={() =>
                          eliminarProducto(
                            producto.id
                          )
                        }

                        className="ml-auto text-red-600 font-black"
                      >
                        Eliminar
                      </button>

                    </div>

                  </div>

                );

              }
            )}


            {/* =================================================
                DATOS CLIENTE
            ================================================= */}

            <div className="bg-[#F8F5EF] rounded-3xl p-6">

              <h3 className="text-xl font-black text-[#7A4E35] mb-5">
                👤 Tus datos
              </h3>


              <div className="grid md:grid-cols-2 gap-4">


                <div>

                  <label className="block text-sm font-bold text-gray-600 mb-2">
                    Nombre
                  </label>

                  <input
                    type="text"

                    value={
                      nombre
                    }

                    onChange={(
                      e
                    ) =>
                      setNombre(
                        e.target.value
                      )
                    }

                    placeholder="Tu nombre"

                    className="w-full p-4 rounded-xl border border-gray-300 bg-white"
                  />

                </div>


                <div>

                  <label className="block text-sm font-bold text-gray-600 mb-2">
                    Teléfono / WhatsApp
                  </label>

                  <input
                    type="tel"

                    value={
                      telefono
                    }

                    onChange={(
                      e
                    ) =>
                      setTelefono(
                        e.target.value
                      )
                    }

                    placeholder="Ej: 2954 123456"

                    className="w-full p-4 rounded-xl border border-gray-300 bg-white"
                  />

                </div>


              </div>

            </div>


            {/* =================================================
                ENTREGA
            ================================================= */}

            <div className="bg-[#F8F5EF] rounded-3xl p-6">


              <h3 className="text-xl font-black text-[#7A4E35] mb-4">
                🚚 Entrega
              </h3>


              <div className="grid md:grid-cols-2 gap-3">


                <label
                  className={`
                    border
                    rounded-2xl
                    p-4
                    cursor-pointer
                    font-bold

                    ${
                      metodoEntrega ===
                      "local"

                        ? "border-[#7A4E35] bg-[#F4EBDD]"

                        : "border-gray-200 bg-white"
                    }
                  `}
                >

                  <input
                    type="radio"

                    value="local"

                    checked={
                      metodoEntrega ===
                      "local"
                    }

                    onChange={(
                      e
                    ) =>
                      setMetodoEntrega(
                        e.target.value
                      )
                    }

                    className="mr-2"
                  />

                  🏪 Retiro en el local

                </label>


                <label
                  className={`
                    border
                    rounded-2xl
                    p-4
                    cursor-pointer
                    font-bold

                    ${
                      metodoEntrega ===
                      "delivery"

                        ? "border-[#2F6B4F] bg-[#E8F3EC]"

                        : "border-gray-200 bg-white"
                    }
                  `}
                >

                  <input
                    type="radio"

                    value="delivery"

                    checked={
                      metodoEntrega ===
                      "delivery"
                    }

                    onChange={(
                      e
                    ) =>
                      setMetodoEntrega(
                        e.target.value
                      )
                    }

                    className="mr-2"
                  />

                  🛵 Delivery
                  {" "}
                  (+$
                  {dinero(
                    precioDelivery
                  )}
                  )

                </label>


              </div>


              {metodoEntrega ===
                "delivery" && (

                <div className="mt-5">

                  <label className="block text-sm font-bold text-gray-600 mb-2">
                    Dirección completa
                  </label>


                  <input
                    type="text"

                    value={
                      direccion
                    }

                    onChange={(
                      e
                    ) =>
                      setDireccion(
                        e.target.value
                      )
                    }

                    placeholder="Ej: San Martín 123"

                    className="w-full p-4 rounded-xl border border-gray-300 bg-white"
                  />


                  <p className="text-xs text-gray-500 mt-2">
                    Escribí calle, número y cualquier referencia útil.
                  </p>

                </div>

              )}


            </div>


            {/* =================================================
                OBSERVACIONES
            ================================================= */}

            <div className="bg-[#F8F5EF] rounded-3xl p-6">


              <h3 className="text-xl font-black text-[#7A4E35] mb-2">
                📝 Observaciones
              </h3>


              <p className="text-sm text-gray-500 mb-4">
                Opcional
              </p>


              <textarea
                value={
                  observaciones
                }

                onChange={(
                  e
                ) =>
                  setObservaciones(
                    e.target.value
                  )
                }

                placeholder="Ej: sin aceitunas, tocar timbre, casa con portón negro..."

                rows={3}

                className="w-full p-4 rounded-xl border border-gray-300 bg-white resize-none"
              />


            </div>


            {/* =================================================
                PAGO
            ================================================= */}

            <div className="bg-[#F8F5EF] rounded-3xl p-6">


              <h3 className="text-xl font-black text-[#7A4E35] mb-4">
                💳 Forma de pago
              </h3>


              <div className="grid md:grid-cols-2 gap-3">


                <label
                  className={`
                    border
                    rounded-2xl
                    p-4
                    cursor-pointer
                    font-bold

                    ${
                      metodoPago ===
                      "efectivo"

                        ? "border-[#7A4E35] bg-[#F4EBDD]"

                        : "border-gray-200 bg-white"
                    }
                  `}
                >

                  <input
                    type="radio"

                    value="efectivo"

                    checked={
                      metodoPago ===
                      "efectivo"
                    }

                    onChange={(
                      e
                    ) =>
                      setMetodoPago(
                        e.target.value
                      )
                    }

                    className="mr-2"
                  />

                  💵 Efectivo

                </label>


                <label
                  className={`
                    border
                    rounded-2xl
                    p-4
                    cursor-pointer
                    font-bold

                    ${
                      metodoPago ===
                      "transferencia"

                        ? "border-[#2F6B4F] bg-[#E8F3EC]"

                        : "border-gray-200 bg-white"
                    }
                  `}
                >

                  <input
                    type="radio"

                    value="transferencia"

                    checked={
                      metodoPago ===
                      "transferencia"
                    }

                    onChange={(
                      e
                    ) =>
                      setMetodoPago(
                        e.target.value
                      )
                    }

                    className="mr-2"
                  />

                  📲 Transferencia

                </label>


              </div>


              {metodoPago ===
                "transferencia" && (

                <div className="mt-4 bg-[#E8F3EC] rounded-xl p-4">

                  <p className="text-sm text-gray-500">
                    Alias
                  </p>


                  <p className="text-[#2F6B4F] text-lg font-black">
                    {
                      sucursal.alias ||
                      "Consultar"
                    }
                  </p>

                </div>

              )}


            </div>


            {/* =================================================
                RESUMEN TOTAL
            ================================================= */}

            <div className="bg-[#7A4E35] text-white rounded-3xl p-6 shadow-2xl">


              <div className="flex flex-col md:flex-row justify-between md:items-center gap-5">


                <div>

                  <p className="text-white/70 text-sm">
                    Subtotal
                  </p>


                  <p className="text-xl font-black">
                    $
                    {dinero(
                      subtotalCarrito
                    )}
                  </p>


                  {metodoEntrega ===
                    "delivery" && (

                    <p className="text-white/70 mt-2">
                      Delivery: $
                      {dinero(
                        precioDelivery
                      )}
                    </p>

                  )}


                  <p className="text-white/70 text-sm mt-4">
                    Total del pedido
                  </p>


                  <p className="text-4xl font-black text-[#E7C873]">
                    $
                    {dinero(
                      totalConDelivery
                    )}
                  </p>

                </div>


                <button
                  type="button"

                  onClick={
                    handleEnviarPedido
                  }

                  disabled={
                    !sucursal.abierto ||
                    enviando
                  }

                  className={`
                    px-8
                    py-4
                    rounded-2xl
                    font-black
                    text-lg

                    ${
                      sucursal.abierto &&
                      !enviando

                        ? "bg-[#E7C873] text-[#1B120D]"

                        : "bg-gray-500 text-white cursor-not-allowed"
                    }
                  `}
                >

                  {!sucursal.abierto
                    ? "Sucursal cerrada"

                    : enviando
                    ? "Confirmando pedido..."

                    : metodoEntrega ===
                      "delivery"
                    ? "🛵 Confirmar delivery"

                    : "🛍️ Confirmar pedido"}

                </button>


              </div>


              {metodoEntrega ===
                "delivery" && (

                <p className="text-xs text-white/60 mt-4">
                  Al confirmar, el pedido se enviará automáticamente al sistema de delivery.
                </p>

              )}


            </div>


          </div>

        )}


      </div>


    </div>
  );
};


export default CarritoPage;