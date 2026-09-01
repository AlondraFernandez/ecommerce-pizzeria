"use client";

import { useEffect, useMemo, useState } from "react";

import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../lib/firebase";

/* ============================================================
   SUCURSALES
============================================================ */

const SUCURSALES = {
  luiggi: {
    id: "luiggi",
    nombre: "Ingeniero Luiggi",
  },

  santa_rosa: {
    id: "santa_rosa",
    nombre: "Santa Rosa",
  },
};

/* ============================================================
   HASH DEL PIN
   El panel de administración guarda SHA-256
============================================================ */

async function hashPin(pin) {
  const bytes = new TextEncoder().encode(String(pin));

  const buffer = await crypto.subtle.digest(
    "SHA-256",
    bytes
  );

  return Array.from(new Uint8Array(buffer))
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

/* ============================================================
   FORMATO DINERO
============================================================ */

function dinero(valor) {
  return Number(valor || 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function RepartidorPage() {
  const [pin, setPin] = useState("");

  const [repartidor, setRepartidor] = useState(null);

  const [pedidos, setPedidos] = useState([]);

  const [cargandoLogin, setCargandoLogin] = useState(false);

  const [cargandoPedidos, setCargandoPedidos] = useState(false);

  const [error, setError] = useState("");

  const [actualizandoId, setActualizandoId] = useState(null);



  /* ============================================================
     RECUPERAR SESIÓN
  ============================================================ */

  useEffect(() => {
    try {
      const guardado =
        localStorage.getItem("repartidorJope");

      if (guardado) {
        const datos = JSON.parse(guardado);

        if (
          datos &&
          datos.repartidorId &&
          datos.nombre &&
          datos.sucursalId
        ) {
          setRepartidor(datos);
        }
      }
    } catch (error) {
      console.error(
        "Error recuperando sesión de repartidor:",
        error
      );
    }
  }, []);

  /* ============================================================
     LOGIN
  ============================================================ */

  async function iniciarSesion(e) {
    e?.preventDefault();

    setError("");

    const pinLimpio = String(pin || "").trim();

    if (!/^\d{4,6}$/.test(pinLimpio)) {
      setError(
        "Ingresá un PIN de entre 4 y 6 números."
      );
      return;
    }

    setCargandoLogin(true);

    try {
      const hash = await hashPin(pinLimpio);

      /*
       * Buscamos los repartidores directamente desde
       * la colección que utiliza el panel de administración.
       */
      const snapshot = await new Promise(
        (resolve, reject) => {
          const unsubscribe = onSnapshot(
            collection(db, "repartidores"),
            (snap) => {
              unsubscribe();
              resolve(snap);
            },
            (err) => {
              unsubscribe();
              reject(err);
            }
          );
        }
      );

      let encontrado = null;

      snapshot.forEach((documento) => {
        const data = documento.data();

        if (
          data?.activo !== false &&
          data?.pinHash === hash
        ) {
          encontrado = {
            repartidorId:
              data.repartidorId ||
              documento.id,

            nombre:
              data.nombre ||
              documento.id,

            sucursalId:
              data.sucursalId ||
              "luiggi",

            sucursalNombre:
              data.sucursalNombre ||
              SUCURSALES[
                data.sucursalId
              ]?.nombre ||
              data.sucursalId ||
              "Sucursal",
          };
        }
      });

      if (!encontrado) {
        setError(
          "PIN incorrecto o repartidor desactivado."
        );
        return;
      }

      localStorage.setItem(
        "repartidorJope",
        JSON.stringify(encontrado)
      );

      setRepartidor(encontrado);
      setPin("");
    } catch (err) {
      console.error(
        "Error iniciando sesión:",
        err
      );

      setError(
        "No se pudo conectar con Firebase. Revisá la conexión."
      );
    } finally {
      setCargandoLogin(false);
    }
  }

  /* ============================================================
     CERRAR SESIÓN
  ============================================================ */

  function cerrarSesion() {
    localStorage.removeItem("repartidorJope");

    setRepartidor(null);
    setPedidos([]);
    setPin("");
    setError("");
  }

  /* ============================================================
     LEER PEDIDOS
  ============================================================ */

  useEffect(() => {
    if (!repartidor?.sucursalId) {
      return;
    }

    setCargandoPedidos(true);
    setError("");

    /*
     * El POS envía la venta con:
     *
     * type: "delivery"
     * tipo: "delivery"
     * sucursalId
     *
     * Por eso filtramos directamente por sucursal.
     */

    const consultas = [
      "pedidos",
      "pedidosDelivery",
      "deliveries",
    ];

    let cancelado = false;

    const unsubscribes = [];

    const pedidosPorId = new Map();

    consultas.forEach((nombreColeccion) => {
      try {
        const referencia = query(
          collection(
            db,
            nombreColeccion
          ),
          where(
            "sucursalId",
            "==",
            repartidor.sucursalId
          )
        );

        const unsubscribe = onSnapshot(
          referencia,
          (snapshot) => {
            if (cancelado) {
              return;
            }

            snapshot.forEach((documento) => {
              const data =
                documento.data();

              const esDelivery =
                data?.type === "delivery" ||
                data?.tipo === "delivery";

              if (!esDelivery) {
                return;
              }

              const pedido = {
                ...data,

                firestoreId:
                  documento.id,

                _coleccion:
                  nombreColeccion,

                id:
                  data.id ||
                  documento.id,

                cliente:
                  data.cliente ||
                  data.customerName ||
                  "Sin nombre",

                direccion:
                  data.direccion ||
                  data.customerAddress ||
                  "",

                hora:
                  data.hora ||
                  data.hour ||
                  "",

                observaciones:
                  data.observaciones ||
                  data.observations ||
                  "",

                total:
                  Number(
                    data.total || 0
                  ),

                items:
                  Array.isArray(
                    data.items
                  )
                    ? data.items
                    : [],

                estado:
                  data.estadoRepartidor === "En camino"
                    ? "En camino"
                    : data.estado === "En reparto"
                    ? "En camino"
                    : data.estadoDelivery === "En camino"
                    ? "En camino"
                    : data.estado === "Entregado"
                    ? "Entregado"
                    : data.estadoRepartidor === "Entregado"
                    ? "Entregado"
                    : "Pendiente",


                sucursalId:
                  data.sucursalId,

                sucursalNombre:
                  data.sucursalNombre ||
                  SUCURSALES[
                    data.sucursalId
                  ]?.nombre ||
                  data.sucursalId,
              };

              pedidosPorId.set(
                `${nombreColeccion}_${documento.id}`,
                pedido
              );
            });

            const lista =
              Array.from(
                pedidosPorId.values()
              )
                .filter(
                  (pedido) =>
                    pedido.sucursalId ===
                    repartidor.sucursalId
                )
                .filter(
                  (pedido) =>
                    pedido.estado !==
                    "Entregado"
                )
                .sort(
                  (a, b) =>
                    Number(
                      b.timestamp || 0
                    ) -
                    Number(
                      a.timestamp || 0
                    )
                );

            setPedidos(lista);
            setCargandoPedidos(false);
          },
          (err) => {
            console.error(
              `Error leyendo ${nombreColeccion}:`,
              err
            );

            /*
             * No mostramos error inmediatamente porque
             * otra colección puede ser la que utiliza el POS.
             */
            setCargandoPedidos(false);
          }
        );

        unsubscribes.push(
          unsubscribe
        );
      } catch (err) {
        console.error(
          `No se pudo consultar ${nombreColeccion}:`,
          err
        );
      }
    });

    return () => {
      cancelado = true;

      unsubscribes.forEach(
        (unsubscribe) =>
          unsubscribe()
      );
    };
  }, [
    repartidor,
  ]);


/* ============================================================
   ACTUALIZAR ESTADO DEL PEDIDO
   Se actualiza el mismo campo "estado" que utiliza el POS
============================================================ */

async function cambiarEstado(
  pedido,
  nuevoEstado
) {
  if (
    !pedido?.firestoreId ||
    !pedido?._coleccion
  ) {
    return;
  }

  setActualizandoId(
    pedido.firestoreId
  );

  try {
    /*
     * El POS utiliza el campo "estado".
     *
     * Por eso:
     *
     * En camino  → En reparto
     * Entregado  → Entregado
     *
     * También guardamos campos específicos del
     * repartidor como información adicional.
     */

    const estadoPOS =
      nuevoEstado === "En camino"
        ? "En reparto"
        : nuevoEstado === "Entregado"
        ? "Entregado"
        : nuevoEstado;

    await updateDoc(
      doc(
        db,
        pedido._coleccion,
        pedido.firestoreId
      ),
      {
        /* ESTADO PRINCIPAL DEL POS */
        estado: estadoPOS,

        /* ESTADOS ESPECÍFICOS DEL DELIVERY */
        estadoRepartidor:
          nuevoEstado,

        estadoDelivery:
          nuevoEstado,

        /* QUIÉN HIZO EL CAMBIO */
        repartidorId:
          repartidor?.repartidorId ||
          "",

        repartidorNombre:
          repartidor?.nombre ||
          "",

        /* FECHA DEL CAMBIO */
        actualizadoPorRepartidor:
          repartidor?.repartidorId ||
          "",

        actualizadoEn:
          serverTimestamp(),
      }
    );

    /*
     * Si se marcó como entregado, lo quitamos
     * automáticamente de la pantalla del repartidor.
     */
    if (
      nuevoEstado === "Entregado"
    ) {
      setPedidos(
        (prev) =>
          prev.filter(
            (item) =>
              !(
                item.firestoreId ===
                pedido.firestoreId
              )
          )
      );
    }
  } catch (err) {
    console.error(
      "Error actualizando estado:",
      err
    );

    alert(
      "No se pudo actualizar el estado del pedido."
    );
  } finally {
    setActualizandoId(
      null
    );
  }
}

  /* ============================================================
     PEDIDOS PENDIENTES
  ============================================================ */

  const pedidosPendientes =
    useMemo(
      () =>
        pedidos.filter(
          (pedido) =>
            !pedido.estado ||
            pedido.estado ===
              "Pendiente" ||
            pedido.estado ===
              "Activo"
        ),
      [pedidos]
    );

  const pedidosEnCamino =
    useMemo(
      () =>
        pedidos.filter(
          (pedido) =>
            pedido.estado ===
            "En camino"
        ),
      [pedidos]
    );

  /* ============================================================
     LOGIN
  ============================================================ */

  if (!repartidor) {
    return (
      <main className="min-h-screen bg-[#f7f3ef] flex items-center justify-center p-5">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[2rem] shadow-xl border border-black/5 p-7">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">
                🛵
              </div>

              <p className="text-xs uppercase tracking-[0.25em] font-black text-[#7A4E35]">
                Pizzería Jope
              </p>

              <h1 className="text-3xl font-black text-[#1B120D] mt-2">
                Jope Delivery
              </h1>

              <p className="text-gray-500 mt-2">
                Ingresá tu PIN para ver tus pedidos.
              </p>
            </div>

            <form
              onSubmit={iniciarSesion}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-black text-[#1B120D] mb-2">
                  PIN
                </label>

                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  value={pin}
                  onChange={(e) =>
                    setPin(
                      e.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  placeholder="••••"
                  className="w-full rounded-2xl border border-gray-300 px-5 py-4 text-center text-3xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-[#7A4E35]"
                />
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 p-4 text-sm font-bold text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  cargandoLogin
                }
                className="w-full rounded-2xl bg-[#7A4E35] hover:bg-[#633d2a] disabled:bg-gray-400 text-white py-4 font-black text-lg"
              >
                {cargandoLogin
                  ? "Verificando..."
                  : "Ingresar"}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-gray-400">
              Acceso exclusivo para repartidores
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ============================================================
     PANEL
  ============================================================ */

  return (
    <main className="min-h-screen bg-[#f7f3ef] pb-10">
      {/* HEADER */}

      <header className="bg-[#1B120D] text-white sticky top-0 z-30 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60 font-black">
              Jope Delivery
            </p>

            <h1 className="text-xl sm:text-2xl font-black">
              Hola, {repartidor.nombre} 👋
            </h1>

            <p className="text-sm text-white/70 mt-1">
              📍{" "}
              {repartidor.sucursalNombre}
            </p>
          </div>

          <button
            type="button"
            onClick={cerrarSesion}
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-black"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        {/* RESUMEN */}

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
            <p className="text-xs text-gray-500 font-bold">
              Pendientes
            </p>

            <p className="text-3xl font-black text-[#7A4E35] mt-1">
              {pedidosPendientes.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
            <p className="text-xs text-gray-500 font-bold">
              En camino
            </p>

            <p className="text-3xl font-black text-blue-600 mt-1">
              {pedidosEnCamino.length}
            </p>
          </div>
        </div>

        {/* ESTADO */}

        {cargandoPedidos && (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm mb-5">
            <div className="text-3xl animate-pulse">
              🛵
            </div>

            <p className="font-bold text-gray-600 mt-2">
              Buscando pedidos...
            </p>
          </div>
        )}

        {!cargandoPedidos &&
          pedidos.length === 0 && (
            <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-black/5">
              <div className="text-6xl">
                🎉
              </div>

              <h2 className="text-2xl font-black text-[#1B120D] mt-4">
                No tenés pedidos pendientes
              </h2>

              <p className="text-gray-500 mt-2">
                Cuando entre un nuevo delivery de{" "}
                {repartidor.sucursalNombre},
                aparecerá acá automáticamente.
              </p>
            </div>
          )}

        {/* PEDIDOS */}

        <div className="space-y-5">
          {pedidos.map(
            (pedido) => (
              <article
                key={`${pedido._coleccion}_${pedido.firestoreId}`}
                className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden"
              >
                {/* CABECERA PEDIDO */}

                <div className="bg-[#1B120D] text-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/60 font-black">
                        Delivery
                      </p>

                      <h2 className="text-2xl font-black mt-1">
                        Pedido #
                        {pedido.id}
                      </h2>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-white/60">
                        Hora
                      </p>

                      <p className="font-black text-lg">
                        {pedido.hora ||
                          "Sin horario"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {/* CLIENTE */}

                  <div className="space-y-3">
                    <div className="rounded-2xl bg-[#f7f3ef] p-4">
                      <p className="text-xs uppercase tracking-wider font-black text-gray-500">
                        Cliente
                      </p>

                      <p className="text-xl font-black text-[#1B120D] mt-1">
                        👤{" "}
                        {pedido.cliente}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#f7f3ef] p-4">
                      <p className="text-xs uppercase tracking-wider font-black text-gray-500">
                        Dirección
                      </p>

                      <p className="text-lg font-black text-[#1B120D] mt-1">
                        📍{" "}
                        {pedido.direccion ||
                          "Sin dirección"}
                      </p>
                    </div>

                    {pedido.observaciones && (
                      <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4">
                        <p className="text-xs uppercase tracking-wider font-black text-yellow-700">
                          Observaciones
                        </p>

                        <p className="font-bold text-yellow-900 mt-1">
                          {pedido.observaciones}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* PRODUCTOS */}

                  <div className="mt-6">
                    <h3 className="font-black text-lg text-[#1B120D] mb-3">
                      🧾 Pedido
                    </h3>

                    <div className="divide-y border rounded-2xl overflow-hidden">
                      {pedido.items.map(
                        (item, index) => (
                          <div
                            key={
                              item.codigo ||
                              item.firebaseProductoId ||
                              index
                            }
                            className="p-4 flex items-start justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <p className="font-black text-[#1B120D]">
                                {item.cantidad} ×{" "}
                                {item.nombre ||
                                  item.firebaseNombre ||
                                  "Producto"}
                              </p>

                              {item.extra && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Extra:{" "}
                                  {item.extra}
                                </p>
                              )}
                            </div>

                            <p className="font-black whitespace-nowrap">
                              {dinero(
                                item.subtotal
                              )}
                            </p>
                          </div>
                        )
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-4 px-2">
                      <span className="font-black text-lg">
                        TOTAL
                      </span>

                      <span className="font-black text-2xl text-[#7A4E35]">
                        {dinero(
                          pedido.total
                        )}
                      </span>
                    </div>
                  </div>

                  {/* ESTADO */}

                  <div className="mt-6">
                    <div className="rounded-2xl bg-gray-50 border p-4 text-center">
                      <p className="text-xs uppercase tracking-wider text-gray-500 font-black">
                        Estado
                      </p>

                      <p className="text-xl font-black mt-1">
                        {pedido.estado ===
                        "En camino"
                          ? "🛵 En camino"
                          : "🟡 Pendiente"}
                      </p>
                    </div>
                  </div>

                  {/* BOTONES */}

                  <div className="grid gap-3 mt-5">
                    {pedido.estado !==
                      "En camino" && (
                      <button
                        type="button"
                        disabled={
                          actualizandoId ===
                          pedido.firestoreId
                        }
                        onClick={() =>
                          cambiarEstado(
                            pedido,
                            "En camino"
                          )
                        }
                        className="w-full bg-[#7A4E35] hover:bg-[#633d2a] disabled:bg-gray-400 text-white rounded-2xl py-4 font-black text-lg"
                      >
                        {actualizandoId ===
                        pedido.firestoreId
                          ? "Actualizando..."
                          : "🛵 Tomar pedido y salir"}
                      </button>
                    )}

                    {pedido.estado ===
                      "En camino" && (
                      <button
                        type="button"
                        disabled={
                          actualizandoId ===
                          pedido.firestoreId
                        }
                        onClick={() =>
                          cambiarEstado(
                            pedido,
                            "Entregado"
                          )
                        }
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-2xl py-4 font-black text-lg"
                      >
                        {actualizandoId ===
                        pedido.firestoreId
                          ? "Actualizando..."
                          : "✅ Marcar como entregado"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          )}
        </div>
      </div>
    </main>
  );
}
