"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";

import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";

const ADMIN_EMAIL = "alondra2017gaitan@gmail.com";

const COLECCIONES = [
  ["ventasPOS", "POS"],
  ["pedidosDelivery", "DELIVERY"],
];

/* =====================================================
   UTILIDADES
===================================================== */

function normalizarTexto(valor) {
  return String(valor ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function soloNumeros(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

function dinero(valor) {
  return Number(valor || 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

/* =====================================================
   FECHAS
===================================================== */

function convertirFecha(valor) {
  if (!valor) return null;

  // Firestore Timestamp
  if (valor && typeof valor.toDate === "function") {
    const fecha = valor.toDate();

    if (!Number.isNaN(fecha.getTime())) {
      return fecha;
    }
  }

  // Date
  if (valor instanceof Date) {
    if (!Number.isNaN(valor.getTime())) {
      return valor;
    }

    return null;
  }

  // Número / timestamp
  if (typeof valor === "number") {
    // Timestamp en segundos
    if (valor < 100000000000) {
      const fecha = new Date(valor * 1000);

      if (!Number.isNaN(fecha.getTime())) {
        return fecha;
      }
    }

    // Timestamp en milisegundos
    const fecha = new Date(valor);

    if (!Number.isNaN(fecha.getTime())) {
      return fecha;
    }
  }

  // String
  if (typeof valor === "string") {
    const texto = valor.trim();

    if (!texto) return null;

    // YYYY-MM-DD
    const match = texto.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (match) {
      const año = Number(match[1]);
      const mes = Number(match[2]);
      const dia = Number(match[3]);

      const fecha = new Date(
        año,
        mes - 1,
        dia
      );

      if (!Number.isNaN(fecha.getTime())) {
        return fecha;
      }
    }

    const fecha = new Date(texto);

    if (!Number.isNaN(fecha.getTime())) {
      return fecha;
    }
  }

  return null;
}

function obtenerFecha(pedido) {
  const candidatos = [
    "fecha",
    "fechaServidor",
    "creadoEn",
    "fechaCreacion",
    "fechaActualizacion",
    "timestamp",
    "fechaLocal",
    "fechaCompleta",
    "createdAt",
    "created_at",
    "updatedAt",
    "updated_at",
    "date",
  ];

  for (const campo of candidatos) {
    if (!(campo in pedido)) continue;

    const fecha = convertirFecha(
      pedido[campo]
    );

    if (fecha) {
      return fecha;
    }
  }

  return null;
}

function formatoFecha(pedido) {
  const fecha = obtenerFecha(pedido);

  if (!fecha) {
    return "Fecha no disponible";
  }

  return fecha.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/* =====================================================
   DATOS DEL CLIENTE
===================================================== */

function obtenerObjetoCliente(pedido) {
  if (
    pedido.cliente &&
    typeof pedido.cliente === "object" &&
    !Array.isArray(pedido.cliente)
  ) {
    return pedido.cliente;
  }

  return {};
}

function obtenerCliente(pedido) {
  const clienteObjeto =
    obtenerObjetoCliente(pedido);

  return (
    pedido.nombre ||
    pedido.nombreCliente ||
    pedido.nombreCompleto ||
    pedido.customerName ||
    clienteObjeto.nombre ||
    clienteObjeto.nombreCliente ||
    clienteObjeto.nombreCompleto ||
    clienteObjeto.name ||
    "Cliente sin nombre"
  );
}

function obtenerTelefono(pedido) {
  const clienteObjeto =
    obtenerObjetoCliente(pedido);

  return (
    pedido.telefono ||
    pedido.telefonoCliente ||
    pedido.customerPhone ||
    pedido.phone ||
    pedido.celular ||
    pedido.whatsapp ||
    clienteObjeto.telefono ||
    clienteObjeto.telefonoCliente ||
    clienteObjeto.customerPhone ||
    clienteObjeto.phone ||
    clienteObjeto.celular ||
    clienteObjeto.whatsapp ||
    ""
  );
}

function obtenerDireccion(pedido) {
  const clienteObjeto =
    obtenerObjetoCliente(pedido);

  return (
    pedido.direccion ||
    pedido.customerAddress ||
    pedido.direccionCliente ||
    pedido.address ||
    clienteObjeto.direccion ||
    clienteObjeto.direccionCliente ||
    clienteObjeto.customerAddress ||
    clienteObjeto.address ||
    ""
  );
}

/* =====================================================
   BUSCAR CLIENTE EN MUCHOS CAMPOS
===================================================== */

function obtenerCamposBusqueda(pedido) {
  const clienteObjeto =
    obtenerObjetoCliente(pedido);

  return [
    // Cliente
    pedido.cliente,
    pedido.nombre,
    pedido.nombreCliente,
    pedido.nombreCompleto,
    pedido.customerName,
    pedido.customer,
    pedido.apellido,
    pedido.apellidoCliente,

    // Cliente como objeto
    clienteObjeto.nombre,
    clienteObjeto.nombreCliente,
    clienteObjeto.nombreCompleto,
    clienteObjeto.name,
    clienteObjeto.apellido,

    // Teléfono
    pedido.telefono,
    pedido.telefonoCliente,
    pedido.customerPhone,
    pedido.phone,
    pedido.celular,
    pedido.whatsapp,

    clienteObjeto.telefono,
    clienteObjeto.telefonoCliente,
    clienteObjeto.customerPhone,
    clienteObjeto.phone,
    clienteObjeto.celular,
    clienteObjeto.whatsapp,

    // Dirección
    pedido.direccion,
    pedido.customerAddress,
    pedido.direccionCliente,
    pedido.address,

    clienteObjeto.direccion,
    clienteObjeto.customerAddress,
    clienteObjeto.direccionCliente,
    clienteObjeto.address,

    // Otros posibles campos
    pedido.email,
    pedido.mail,
    pedido.emailCliente,
  ].filter(
    (valor) =>
      valor !== undefined &&
      valor !== null &&
      typeof valor !== "object"
  );
}

function coincideCliente(pedido, busqueda) {
  const textoBusqueda =
    normalizarTexto(busqueda);

  if (!textoBusqueda) {
    return false;
  }

  const numeroBusqueda =
    soloNumeros(busqueda);

  const campos =
    obtenerCamposBusqueda(pedido);

  return campos.some((campo) => {
    const textoCampo =
      normalizarTexto(campo);

    if (!textoCampo) {
      return false;
    }

    // Búsqueda normal
    if (textoCampo.includes(textoBusqueda)) {
      return true;
    }

    // Búsqueda por teléfono
    if (numeroBusqueda.length >= 4) {
      const numeroCampo =
        soloNumeros(campo);

      if (
        numeroCampo &&
        numeroCampo.includes(numeroBusqueda)
      ) {
        return true;
      }
    }

    return false;
  });
}

/* =====================================================
   TOTAL
===================================================== */

function obtenerTotal(pedido) {
  return Number(
    pedido.total ??
      pedido.totalFinal ??
      pedido.monto ??
      pedido.precioTotal ??
      pedido.totalVenta ??
      0
  );
}

/* =====================================================
   PAGO
===================================================== */

function obtenerPago(pedido) {
  return (
    pedido.metodoPago ||
    pedido.formaPago ||
    pedido.pago ||
    pedido.medioPago ||
    "No informado"
  );
}

/* =====================================================
   TIPO
===================================================== */

function obtenerTipo(pedido) {
  return (
    pedido.tipo ||
    pedido.metodoEntrega ||
    pedido.tipoEntrega ||
    "No informado"
  );
}

/* =====================================================
   SUCURSAL
===================================================== */

function obtenerSucursal(pedido) {
  return (
    pedido.sucursalNombre ||
    pedido.sucursal ||
    pedido.sucursalId ||
    "No informada"
  );
}

/* =====================================================
   PRODUCTOS
===================================================== */

function obtenerItems(pedido) {
  const items =
    pedido.items ||
    pedido.productos ||
    pedido.detalle ||
    pedido.detalles ||
    [];

  if (!Array.isArray(items)) {
    if (
      typeof items === "object" &&
      items !== null
    ) {
      return JSON.stringify(items);
    }

    return String(items || "");
  }

  return items
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (
        !item ||
        typeof item !== "object"
      ) {
        return "Producto";
      }

      const nombre =
        item.nombre ||
        item.Nombre ||
        item.producto ||
        item.descripcion ||
        item.name ||
        "Producto";

      const cantidad =
        item.cantidad ??
        item.qty ??
        item.cant ??
        item.quantity ??
        1;

      return `${cantidad} x ${nombre}`;
    })
    .join(" • ");
}

/* =====================================================
   PÁGINA
===================================================== */

export default function BuscarClientePage() {
  const router = useRouter();

  const { user } = useAuth();

  const [busqueda, setBusqueda] =
    useState("");

  const [resultados, setResultados] =
    useState([]);

  const [cargando, setCargando] =
    useState(false);

  const [buscado, setBuscado] =
    useState(false);

  const [error, setError] =
    useState("");

  const [cantidadPOS, setCantidadPOS] =
    useState(0);

  const [cantidadDelivery, setCantidadDelivery] =
    useState(0);

  const esAdmin =
    user?.email?.toLowerCase() ===
    ADMIN_EMAIL.toLowerCase();

  /* =====================================================
     BUSCAR
  ===================================================== */

  const buscarCliente = async () => {
    const texto =
      normalizarTexto(busqueda);

    if (!texto) {
      setError(
        "Ingresá un nombre, teléfono o dirección."
      );

      setResultados([]);
      return;
    }

    try {
      setCargando(true);
      setError("");
      setBuscado(true);

      /*
       * IMPORTANTE:
       *
       * NO usamos orderBy
       * NO usamos limit
       * NO usamos filtro por fecha
       *
       * Traemos TODOS los documentos de:
       *
       * ventasPOS
       * pedidosDelivery
       */

      const resultadosColecciones =
        await Promise.all(
          COLECCIONES.map(
            async ([coleccion, origen]) => {
              const referencia =
                collection(db, coleccion);

              const snapshot =
                await getDocs(referencia);

              const documentos =
                snapshot.docs.map(
                  (documento) => ({
                    id: documento.id,
                    ...documento.data(),
                    _coleccion:
                      coleccion,
                    _origen:
                      origen,
                  })
                );

              return {
                coleccion,
                origen,
                documentos,
              };
            }
          )
        );

      /* =================================================
         MOSTRAR CANTIDADES DE TODA LA COLECCIÓN
      ================================================= */

      const pos =
        resultadosColecciones.find(
          (grupo) =>
            grupo.coleccion ===
            "ventasPOS"
        );

      const delivery =
        resultadosColecciones.find(
          (grupo) =>
            grupo.coleccion ===
            "pedidosDelivery"
        );

      setCantidadPOS(
        pos?.documentos?.length || 0
      );

      setCantidadDelivery(
        delivery?.documentos?.length || 0
      );

      /* =================================================
         UNIR TODO
      ================================================= */

      const todos =
        resultadosColecciones.flatMap(
          (grupo) =>
            grupo.documentos
        );

      /* =================================================
         BUSCAR CLIENTE
      ================================================= */

      const encontrados =
        todos
          .filter((pedido) =>
            coincideCliente(
              pedido,
              busqueda
            )
          )
          .sort((a, b) => {
            const fechaA =
              obtenerFecha(a)
                ?.getTime() || 0;

            const fechaB =
              obtenerFecha(b)
                ?.getTime() || 0;

            return fechaB - fechaA;
          });

      setResultados(
        encontrados
      );
    } catch (error) {
      console.error(
        "Error buscando cliente:",
        error
      );

      setResultados([]);

      setError(
        error?.message ||
          "No se pudo consultar la base de datos."
      );
    } finally {
      setCargando(false);
    }
  };

  /* =====================================================
     LIMPIAR
  ===================================================== */

  const limpiar = () => {
    setBusqueda("");
    setResultados([]);
    setBuscado(false);
    setError("");
    setCantidadPOS(0);
    setCantidadDelivery(0);
  };

  /* =====================================================
     SEGURIDAD
  ===================================================== */

  if (!user) {
    return (
      <div className="min-h-screen bg-[#1B120D] text-white flex items-center justify-center">
        <p className="text-xl font-black">
          Cargando panel...
        </p>
      </div>
    );
  }

  if (!esAdmin) {
    router.replace("/");
    return null;
  }

  /* =====================================================
     TOTAL HISTÓRICO
  ===================================================== */

  const totalHistorial =
    resultados.reduce(
      (total, pedido) =>
        total +
        obtenerTotal(pedido),
      0
    );

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-screen bg-[#F4F1EC] text-[#1B120D]">

      {/* HEADER */}

      <header className="sticky top-0 z-30 bg-white border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 md:px-7 py-5">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>

              <p className="text-xs uppercase tracking-[0.25em] font-black text-[#8C6B3F]">
                Pizzería Jope
              </p>

              <h1 className="text-3xl md:text-4xl font-black">
                Buscar cliente
              </h1>

              <p className="text-gray-500 mt-1">
                Historial completo de ventas y
                deliveries guardado en Firestore.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/admin")
              }
              className="bg-[#1B120D] text-white px-5 py-3 rounded-2xl font-black"
            >
              ← Volver al panel
            </button>

          </div>

        </div>
      </header>

      {/* CONTENIDO */}

      <main className="max-w-7xl mx-auto px-4 md:px-7 py-7">

        {/* BUSCADOR */}

        <section className="bg-white rounded-3xl shadow-sm border border-black/5 p-5 md:p-7">

          <div className="flex flex-col md:flex-row gap-3">

            <input
              value={busqueda}
              onChange={(e) =>
                setBusqueda(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  buscarCliente();
                }
              }}
              placeholder="Nombre, teléfono o dirección..."
              className="flex-1 border border-gray-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#E7C873]"
            />

            <button
              type="button"
              onClick={buscarCliente}
              disabled={cargando}
              className="bg-[#E7C873] px-7 py-4 rounded-2xl font-black disabled:opacity-50"
            >
              {cargando
                ? "Buscando..."
                : "🔎 Buscar"}
            </button>

            <button
              type="button"
              onClick={limpiar}
              className="bg-gray-100 px-6 py-4 rounded-2xl font-black"
            >
              Limpiar
            </button>

          </div>

          <p className="text-sm text-gray-500 mt-4">
            Busca en{" "}
            <strong>ventasPOS</strong>
            {" "}y{" "}
            <strong>pedidosDelivery</strong>
            {" "}sin límite de fecha.
          </p>

          {error && (
            <div className="mt-4 bg-red-50 text-red-700 rounded-2xl p-4 font-bold">
              {error}
            </div>
          )}

        </section>

        {/* RESULTADOS */}

        {buscado && !cargando && (
          <>

            {/* RESUMEN */}

            <section className="grid md:grid-cols-4 gap-4 mt-6">

              <div className="bg-white rounded-3xl p-5 border border-black/5">
                <p className="text-xs uppercase tracking-widest font-black text-gray-400">
                  Pedidos encontrados
                </p>

                <p className="text-3xl font-black mt-2">
                  {resultados.length}
                </p>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-black/5">
                <p className="text-xs uppercase tracking-widest font-black text-gray-400">
                  Total histórico
                </p>

                <p className="text-3xl font-black mt-2">
                  {dinero(
                    totalHistorial
                  )}
                </p>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-black/5">
                <p className="text-xs uppercase tracking-widest font-black text-gray-400">
                  Ventas POS
                </p>

                <p className="text-3xl font-black mt-2">
                  {cantidadPOS}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Documentos revisados
                </p>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-black/5">
                <p className="text-xs uppercase tracking-widest font-black text-gray-400">
                  Delivery
                </p>

                <p className="text-3xl font-black mt-2">
                  {cantidadDelivery}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Documentos revisados
                </p>
              </div>

            </section>

            {/* LISTA */}

            <section className="mt-6 space-y-4">

              {resultados.length === 0 ? (

                <div className="bg-white rounded-3xl p-8 text-center border border-black/5">

                  <p className="text-2xl font-black">
                    No encontramos pedidos.
                  </p>

                  <p className="text-gray-500 mt-2">
                    Probá con el teléfono completo,
                    parte del nombre o dirección.
                  </p>

                </div>

              ) : (

                resultados.map(
                  (pedido, indice) => (

                    <article
                      key={`${pedido._coleccion}-${pedido.id}-${indice}`}
                      className="bg-white rounded-3xl border border-black/5 shadow-sm p-5 md:p-6"
                    >

                      {/* CABECERA */}

                      <div className="flex flex-col lg:flex-row lg:justify-between gap-4">

                        <div>

                          <div className="flex flex-wrap gap-2 mb-3">

                            <span className="px-3 py-1 rounded-full bg-[#1B120D] text-white text-xs font-black">
                              {pedido._origen}
                            </span>

                            <span className="px-3 py-1 rounded-full bg-[#F4F1EC] text-xs font-black">
                              {obtenerSucursal(
                                pedido
                              )}
                            </span>

                            <span className="px-3 py-1 rounded-full bg-[#F4F1EC] text-xs font-black">
                              {obtenerTipo(
                                pedido
                              )}
                            </span>

                          </div>

                          <h2 className="text-2xl font-black">
                            {obtenerCliente(
                              pedido
                            )}
                          </h2>

                          <p className="text-gray-500">
                            {formatoFecha(
                              pedido
                            )}
                          </p>

                        </div>

                        <div className="lg:text-right">

                          <p className="text-xs uppercase tracking-widest font-black text-gray-400">
                            Total
                          </p>

                          <p className="text-3xl font-black text-[#2F6B4F]">
                            {dinero(
                              obtenerTotal(
                                pedido
                              )
                            )}
                          </p>

                        </div>

                      </div>

                      {/* DATOS */}

                      <div className="grid md:grid-cols-2 gap-4 mt-6">

                        <div className="bg-[#F8F6F2] rounded-2xl p-4">

                          <p className="text-xs uppercase tracking-widest font-black text-gray-400">
                            Teléfono
                          </p>

                          <p className="font-bold mt-1 break-words">
                            {obtenerTelefono(
                              pedido
                            ) ||
                              "No informado"}
                          </p>

                        </div>

                        <div className="bg-[#F8F6F2] rounded-2xl p-4">

                          <p className="text-xs uppercase tracking-widest font-black text-gray-400">
                            Dirección
                          </p>

                          <p className="font-bold mt-1 break-words">
                            {obtenerDireccion(
                              pedido
                            ) ||
                              "No informada"}
                          </p>

                        </div>

                        <div className="bg-[#F8F6F2] rounded-2xl p-4">

                          <p className="text-xs uppercase tracking-widest font-black text-gray-400">
                            Forma de pago
                          </p>

                          <p className="font-bold mt-1">
                            {obtenerPago(
                              pedido
                            )}
                          </p>

                        </div>

                        <div className="bg-[#F8F6F2] rounded-2xl p-4">

                          <p className="text-xs uppercase tracking-widest font-black text-gray-400">
                            ID del pedido
                          </p>

                          <p className="font-mono text-xs mt-2 break-all">
                            {pedido.id}
                          </p>

                        </div>

                      </div>

                      {/* PEDIDO */}

                      {obtenerItems(
                        pedido
                      ) && (

                        <div className="mt-4 bg-[#F8F6F2] rounded-2xl p-4">

                          <p className="text-xs uppercase tracking-widest font-black text-gray-400">
                            Pedido
                          </p>

                          <p className="font-bold mt-2 leading-relaxed">
                            {obtenerItems(
                              pedido
                            )}
                          </p>

                        </div>

                      )}

                      <p className="text-xs text-gray-400 mt-4">
                        Colección:{" "}
                        {pedido._coleccion}
                      </p>

                    </article>

                  )
                )

              )}

            </section>

          </>
        )}

      </main>

    </div>
  );
}