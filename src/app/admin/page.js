"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import Swal from "sweetalert2";

import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { useSucursal } from "../context/SucursalContext";

import PromosPanel from "./components/PromosPanel";
import EmpleadasPanel from "./components/EmpleadasPanel";
import RepartidoresPanel from "./components/RepartidoresPanel";


const ADMIN_EMAIL =
  "alondra2017gaitan@gmail.com";


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


const VARIEDADES = [
  {
    clave: "jamon_y_queso",
    nombre: "Jamón y queso",
  },
  {
    clave: "carne",
    nombre: "Carne",
  },
  {
    clave: "pollo",
    nombre: "Pollo",
  },
  {
    clave: "capresse",
    nombre: "Capresse",
  },
  {
    clave: "humita",
    nombre: "Humita",
  },
  {
    clave: "arabe",
    nombre: "Árabe",
  },
  {
    clave: "roquefort",
    nombre: "Roquefort",
  },
];


const CONFIG_BASE = {
  precioDelivery: 0,
  whatsapp: "",
  alias: "",
  direccion: "",
  horario: "19:30 a 00:00",
  abierto: true,

  mensajeCerrado:
    "En este momento no estamos tomando pedidos.",
};


/* ======================================================
   UTILIDADES
====================================================== */

function normalizarTexto(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}





function dinero(valor) {
  return Number(valor || 0).toLocaleString(
    "es-AR",
    {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }
  );
}


function fechaHora(valor) {
  if (!valor) return "-";

  if (
    typeof valor === "object" &&
    typeof valor.toDate === "function"
  ) {
    return valor
      .toDate()
      .toLocaleString("es-AR");
  }

  if (typeof valor === "number") {
    return new Date(valor)
      .toLocaleString("es-AR");
  }

  return String(valor);
}


function obtenerInicioSemana(
  fechaBase = new Date()
) {
  const inicio =
    new Date(fechaBase);

  const dia =
    inicio.getDay();

  const diferencia =
    dia === 0
      ? -6
      : 1 - dia;

  inicio.setDate(
    inicio.getDate() +
      diferencia
  );

  inicio.setHours(
    0,
    0,
    0,
    0
  );

  return inicio;
}


function obtenerFinSemana(
  fechaBase = new Date()
) {
  const inicio =
    obtenerInicioSemana(
      fechaBase
    );

  const fin =
    new Date(inicio);

  fin.setDate(
    fin.getDate() + 6
  );

  fin.setHours(
    23,
    59,
    59,
    999
  );

  return fin;
}


function fechaISO(fecha) {
  return [
    fecha.getFullYear(),

    String(
      fecha.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),

    String(
      fecha.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("-");
}


function formatoFecha(fecha) {
  return fecha.toLocaleDateString(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}


function fechaVentaAJS(venta) {

  /* FIREBASE TIMESTAMP */

  const candidatos = [
    venta.fecha,
    venta.fechaServidor,
    venta.creadoEn,
    venta.fechaCreacion,
    venta.fechaActualizacion,
  ];


  for (
    const candidato
    of candidatos
  ) {

    if (
      candidato &&
      typeof candidato.toDate ===
        "function"
    ) {
      return candidato.toDate();
    }

  }


  /* TIMESTAMP NUMÉRICO */

  if (
    venta.timestamp
  ) {

    const fecha =
      new Date(
        Number(
          venta.timestamp
        )
      );


    if (
      !isNaN(
        fecha.getTime()
      )
    ) {
      return fecha;
    }

  }


  /* FECHA STRING */

  const textos = [
    venta.fechaLocal,
    venta.fechaCompleta,
  ];


  for (
    const texto
    of textos
  ) {

    if (!texto) {
      continue;
    }


    const fecha =
      new Date(
        texto
      );


    if (
      !isNaN(
        fecha.getTime()
      )
    ) {
      return fecha;
    }

  }


  return null;
}


function esDeHoy(venta) {
  const fecha =
    fechaVentaAJS(venta);

  if (!fecha) {
    return false;
  }

  const hoy =
    new Date();

  return (
    fecha.getFullYear() ===
      hoy.getFullYear() &&
    fecha.getMonth() ===
      hoy.getMonth() &&
    fecha.getDate() ===
      hoy.getDate()
  );
}


/* ======================================================
   ADMIN
====================================================== */

export default function AdminPage() {
  const router =
    useRouter();

  const { user } =
    useAuth();

  const {
    elegirSucursal,
  } = useSucursal();


  /* ====================================================
     NAVEGACIÓN
  ==================================================== */

  const [
    seccion,
    setSeccion,
  ] = useState(
    "resumen"
  );

  const [
    filtroSucursal,
    setFiltroSucursal,
  ] = useState(
    "todas"
  );

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  /* ====================================================
     DATOS POS
  ==================================================== */

  const [
    ventas,
    setVentas,
  ] = useState([]);

  const [
    cierres,
    setCierres,
  ] = useState([]);

  const [
    cancelaciones,
    setCancelaciones,
  ] = useState([]);

  const [
    deliveries,
    setDeliveries,
  ] = useState([]);

  const [
    movimientos,
    setMovimientos,
  ] = useState([]);

  const [
    productosLuiggi,
    setProductosLuiggi,
  ] = useState([]);

  const [
    productosSantaRosa,
    setProductosSantaRosa,
  ] = useState([]);


  /* ====================================================
   PRODUCCIÓN
==================================================== */

const [
  empleadas,
  setEmpleadas,
] = useState([]);

const [
  producciones,
  setProducciones,
] = useState([]);



const [
  marcandoPago,
  setMarcandoPago,
] = useState(null);

  /* ====================================================
     CONFIG SUCURSAL
  ==================================================== */

  const [
    configSucursalId,
    setConfigSucursalId,
  ] = useState(
    "luiggi"
  );

  const [
    configuracion,
    setConfiguracion,
  ] = useState({
    ...CONFIG_BASE,
  });

  const [
    guardandoConfiguracion,
    setGuardandoConfiguracion,
  ] = useState(false);


  /* ====================================================
     SEMANA
  ==================================================== */

  const inicioSemana =
    useMemo(
      () =>
        obtenerInicioSemana(),
      []
    );

  const finSemana =
    useMemo(
      () =>
        obtenerFinSemana(),
      []
    );

  const semanaId =
    useMemo(
      () =>
        fechaISO(
          inicioSemana
        ),
      [
        inicioSemana,
      ]
    );


  const esAdmin =
    user?.email
      ?.toLowerCase() ===
    ADMIN_EMAIL.toLowerCase();


  /* ====================================================
     SEGURIDAD
  ==================================================== */

  useEffect(
    () => {
      if (!user) {
        return;
      }

      if (!esAdmin) {
        router.replace("/");
      }
    },
    [
      user,
      esAdmin,
      router,
    ]
  );


  /* ====================================================
     SINCRONIZAR SUCURSAL
  ==================================================== */

  useEffect(
    () => {
      if (
        filtroSucursal !==
        "todas"
      ) {
        setConfigSucursalId(
          filtroSucursal
        );
      }
    },
    [
      filtroSucursal,
    ]
  );


  /* ====================================================
     MIGRAR ALMA Y YANE
  ==================================================== */

  useEffect(
    () => {
      if (
        !user ||
        !esAdmin
      ) {
        return;
      }

      const migrar =
        async () => {
          const base = [
            {
              id: "alma",
              nombre: "Alma",
            },
            {
              id: "yane",
              nombre: "Yane",
            },
          ];

          for (
            const item of base
          ) {
            try {
              const referencia =
                doc(
                  db,
                  "configuracionProduccion",
                  item.id
                );

              const snapshot =
                await getDoc(
                  referencia
                );

              if (
                !snapshot.exists()
              ) {
                await setDoc(
                  referencia,
                  {
                    empleadaId:
                      item.id,

                    nombre:
                      item.nombre,

                    empleada:
                      item.nombre,

                    precioDocena:
                      0,

                    activa:
                      true,

                    creadoEn:
                      serverTimestamp(),

                    actualizadoEn:
                      serverTimestamp(),
                  }
                );
              } else {
                const datos =
                  snapshot.data();

                const cambios =
                  {};

                if (
                  datos.nombre ===
                  undefined
                ) {
                  cambios.nombre =
                    datos.empleada ||
                    item.nombre;
                }

                if (
                  datos.activa ===
                  undefined
                ) {
                  cambios.activa =
                    true;
                }

                if (
                  Object.keys(
                    cambios
                  ).length > 0
                ) {
                  cambios.actualizadoEn =
                    serverTimestamp();

                  await setDoc(
                    referencia,
                    cambios,
                    {
                      merge: true,
                    }
                  );
                }
              }
            } catch (error) {
              console.error(
                "Error migrando:",
                error
              );
            }
          }
        };

      migrar();
    },
    [
      user,
      esAdmin,
    ]
  );


  /* ====================================================
     EMPLEADAS FIREBASE
  ==================================================== */

  useEffect(
    () => {
      if (
        !user ||
        !esAdmin
      ) {
        return;
      }

      const unsubscribe =
        onSnapshot(
          collection(
            db,
            "configuracionProduccion"
          ),

          snapshot => {
            const lista =
              snapshot.docs
                .map(
                  documento => {
                    const data =
                      documento.data();

                    return {
                      id:
                        documento.id,

                      empleadaId:
                        documento.id,

                      nombre:
                        data.nombre ||
                        data.empleada ||
                        documento.id,

                      precioDocena:
                        Number(
                          data.precioDocena ||
                          0
                        ),

                      activa:
                        data.activa !==
                        false,

                      ...data,
                    };
                  }
                )
                .sort(
                  (a, b) =>
                    String(
                      a.nombre
                    ).localeCompare(
                      String(
                        b.nombre
                      ),
                      "es"
                    )
                );

            setEmpleadas(
              lista
            );

            const nuevosDatos =
              {};

            lista.forEach(
              empleada => {
                nuevosDatos[
                  empleada.id
                ] = {
                  nombre:
                    empleada.nombre,

                  precioDocena:
                    String(
                      empleada.precioDocena
                    ),
                };
              }
            );

            setDatosEmpleadas(
              nuevosDatos
            );
          },

          error => {
            console.error(
              "Error empleadas:",
              error
            );
          }
        );

      return () =>
        unsubscribe();
    },
    [
      user,
      esAdmin,
    ]
  );


  /* ====================================================
     PRODUCCIONES FIREBASE
  ==================================================== */

  useEffect(
    () => {
      if (
        !user ||
        !esAdmin
      ) {
        return;
      }

      const unsubscribe =
        onSnapshot(
          collection(
            db,
            "producciones"
          ),

          snapshot => {
            setProducciones(
              snapshot.docs.map(
                documento => ({
                  id:
                    documento.id,

                  ...documento.data(),
                })
              )
            );
          },

          error => {
            console.error(
              "Error producciones:",
              error
            );
          }
        );

      return () =>
        unsubscribe();
    },
    [
      user,
      esAdmin,
    ]
  );


  /* ====================================================
     PRODUCTOS LUIGGI
  ==================================================== */

  useEffect(
    () => {
      if (
        !user ||
        !esAdmin
      ) {
        return;
      }

      const unsubscribe =
        onSnapshot(
          collection(
            db,
            "sucursales",
            "luiggi",
            "productos"
          ),

          snapshot => {
            const lista =
              snapshot.docs
                .map(
                  documento => ({
                    id:
                      documento.id,

                    sucursalId:
                      "luiggi",

                    ...documento.data(),

                    precio:
                      Number(
                        documento.data()
                          .precio ||
                        0
                      ),

                    stock:
                      Number(
                        documento.data()
                          .stock ||
                        0
                      ),
                  })
                )
                .sort(
                  (a, b) =>
                    String(
                      a.Nombre ||
                      ""
                    ).localeCompare(
                      String(
                        b.Nombre ||
                        ""
                      ),
                      "es"
                    )
                );

            setProductosLuiggi(
              lista
            );
          },

          error => {
            console.error(
              error
            );
          }
        );

      return () =>
        unsubscribe();
    },
    [
      user,
      esAdmin,
    ]
  );


  /* ====================================================
     PRODUCTOS SANTA ROSA
  ==================================================== */

  useEffect(
    () => {
      if (
        !user ||
        !esAdmin
      ) {
        return;
      }

      const unsubscribe =
        onSnapshot(
          collection(
            db,
            "sucursales",
            "santa_rosa",
            "productos"
          ),

          snapshot => {
            const lista =
              snapshot.docs
                .map(
                  documento => ({
                    id:
                      documento.id,

                    sucursalId:
                      "santa_rosa",

                    ...documento.data(),

                    precio:
                      Number(
                        documento.data()
                          .precio ||
                        0
                      ),

                    stock:
                      Number(
                        documento.data()
                          .stock ||
                        0
                      ),
                  })
                )
                .sort(
                  (a, b) =>
                    String(
                      a.Nombre ||
                      ""
                    ).localeCompare(
                      String(
                        b.Nombre ||
                        ""
                      ),
                      "es"
                    )
                );

            setProductosSantaRosa(
              lista
            );
          },

          error => {
            console.error(
              error
            );
          }
        );

      return () =>
        unsubscribe();
    },
    [
      user,
      esAdmin,
    ]
  );


  /* ====================================================
     CONFIGURACIÓN SUCURSAL
  ==================================================== */

  useEffect(
    () => {
      if (
        !user ||
        !esAdmin ||
        !configSucursalId
      ) {
        return;
      }

      const referencia =
        doc(
          db,
          "sucursales",
          configSucursalId,
          "configuracion",
          "general"
        );

      const unsubscribe =
        onSnapshot(
          referencia,

          snapshot => {
            if (
              snapshot.exists()
            ) {
              const data =
                snapshot.data();

              setConfiguracion({
                ...CONFIG_BASE,
                ...data,

                precioDelivery:
                  Number(
                    data.precioDelivery ||
                    0
                  ),

                abierto:
                  data.abierto !==
                  false,
              });
            } else {
              setConfiguracion({
                ...CONFIG_BASE,
              });
            }
          },

          error => {
            console.error(
              "Error configuración:",
              error
            );
          }
        );

      return () =>
        unsubscribe();
    },
    [
      user,
      esAdmin,
      configSucursalId,
    ]
  );


  /* ====================================================
     LEER COLECCIÓN
  ==================================================== */

  const leerColeccion =
    useCallback(
      async (
        nombre,
        maximo = 500
      ) => {
        try {
          const consulta =
            query(
              collection(
                db,
                nombre
              ),

              orderBy(
                "fecha",
                "desc"
              ),

              limit(maximo)
            );

          const snapshot =
            await getDocs(
              consulta            );

          return snapshot.docs.map(
            documento => ({
              id: documento.id,
              ...documento.data(),
            })
          );

        } catch (error) {

          /*
           * Algunos registros viejos pueden no tener
           * el campo fecha. Si Firestore no permite
           * ordenar, hacemos una segunda lectura
           * sin orderBy.
           */

          console.warn(
            `Lectura alternativa de ${nombre}:`,
            error
          );

          try {

            const consultaSimple =
              query(
                collection(
                  db,
                  nombre
                ),
                limit(maximo)
              );

            const snapshot =
              await getDocs(
                consultaSimple
              );

            return snapshot.docs.map(
              documento => ({
                id: documento.id,
                ...documento.data(),
              })
            );

          } catch (segundoError) {

            console.error(
              `Error leyendo ${nombre}:`,
              segundoError
            );

            return [];

          }

        }
      },
      []
    );


  /* ====================================================
     CARGA GENERAL DE MOVIMIENTOS
  ==================================================== */

  useEffect(
    () => {

      if (
        !user ||
        !esAdmin
      ) {
        return;
      }


      let activo =
        true;


      const cargarDatos =
        async () => {

          try {

            setCargando(
              true
            );

            setError("");


            const [
  ventasPOSData,
  pedidosWebData,
  cierresData,
  cancelacionesData,
  deliveriesData,
  movimientosData,
] =
  await Promise.all([

    // VENTAS DEL POS
    leerColeccion(
      "ventasPOS",
      1000
    ),

    // PEDIDOS HECHOS DESDE LA WEB
    leerColeccion(
      "pedidosWeb",
      1000
    ),

    // CIERRES
    leerColeccion(
      "cierresCaja",
      300
    ),

    // CANCELACIONES
    leerColeccion(
      "cancelaciones",
      500
    ),

    // DELIVERY REAL
    leerColeccion(
      "pedidosDelivery",
      500
    ),

    // STOCK
    leerColeccion(
      "movimientosStock",
      1000
    ),
  ]);


/* =========================================
   NORMALIZAR VENTAS POS
========================================= */

const ventasPOSNormalizadas =
  ventasPOSData.map(
    (venta) => ({
      ...venta,

      origen:
        venta.origen ||
        "pos",

      tipoOrigen:
        "POS",

      cliente:
        venta.cliente ||
        venta.customerName ||
        "Mostrador",

      metodoPago:
        venta.metodoPago ||
        venta.formaPago ||
        "",

      total:
        Number(
          venta.total ||
          venta.totalFinal ||
          0
        ),
    })
  );


/* =========================================
   NORMALIZAR PEDIDOS WEB
========================================= */

const pedidosWebNormalizados =
  pedidosWebData.map(
    (pedido) => ({
      ...pedido,

      origen:
        "web",

      tipoOrigen:
        "WEB",

      cliente:
        pedido.nombre ||
        pedido.cliente ||
        "Cliente web",

      tipo:
        pedido.metodoEntrega ||
        pedido.tipo ||
        "web",

      metodoPago:
        pedido.metodoPago ||
        "",

      total:
        Number(
          pedido.total ||
          0
        ),
    })
  );


/* =========================================
   UNIR POS + WEB
========================================= */

const todasLasVentas = [
  ...ventasPOSNormalizadas,
  ...pedidosWebNormalizados,
];


setVentas(
  todasLasVentas
);

setCierres(
  cierresData
);

setCancelaciones(
  cancelacionesData
);

setDeliveries(
  deliveriesData
);

setMovimientos(
  movimientosData
);


            if (!activo) {
              return;
            }


            setVentas(
              todasLasVentas
            );

            setCierres(
              cierresData
            );

            setCancelaciones(
              cancelacionesData
            );

            setDeliveries(
              deliveriesData
            );

            setMovimientos(
              movimientosData
            );

          } catch (error) {

            console.error(
              "Error cargando panel:",
              error
            );


            if (activo) {

              setError(
                "No se pudieron cargar algunos datos del panel."
              );

            }

          } finally {

            if (activo) {

              setCargando(
                false
              );

            }

          }

        };


      cargarDatos();


      return () => {

        activo =
          false;

      };

    },
    [
      user,
      esAdmin,
      leerColeccion,
    ]
  );


  /* ====================================================
     FILTROS POR SUCURSAL
  ==================================================== */

  const coincideSucursal =
    useCallback(
      registro => {

        if (
          filtroSucursal ===
          "todas"
        ) {
          return true;
        }


        return (
          registro.sucursalId ===
            filtroSucursal ||
          registro.sucursal ===
            filtroSucursal
        );

      },
      [
        filtroSucursal,
      ]
    );


  const ventasFiltradas =
    useMemo(
      () =>
        ventas.filter(
          coincideSucursal
        ),
      [
        ventas,
        coincideSucursal,
      ]
    );


  const cierresFiltrados =
    useMemo(
      () =>
        cierres.filter(
          coincideSucursal
        ),
      [
        cierres,
        coincideSucursal,
      ]
    );


  const cancelacionesFiltradas =
    useMemo(
      () =>
        cancelaciones.filter(
          coincideSucursal
        ),
      [
        cancelaciones,
        coincideSucursal,
      ]
    );


  const deliveriesFiltrados =
    useMemo(
      () =>
        deliveries.filter(
          coincideSucursal
        ),
      [
        deliveries,
        coincideSucursal,
      ]
    );


  const movimientosFiltrados =
    useMemo(
      () =>
        movimientos.filter(
          coincideSucursal
        ),
      [
        movimientos,
        coincideSucursal,
      ]
    );


  /* ====================================================
     PRODUCTOS FILTRADOS
  ==================================================== */

  const productosFiltrados =
    useMemo(
      () => {

        if (
          filtroSucursal ===
          "luiggi"
        ) {
          return productosLuiggi;
        }


        if (
          filtroSucursal ===
          "santa_rosa"
        ) {
          return productosSantaRosa;
        }


        return [
          ...productosLuiggi,
          ...productosSantaRosa,
        ];

      },
      [
        filtroSucursal,
        productosLuiggi,
        productosSantaRosa,
      ]
    );


  /* ====================================================
     RESUMEN DE VENTAS
  ==================================================== */

  const ventasValidas =
    useMemo(
      () =>
        ventasFiltradas.filter(
          venta =>
            String(
              venta.estado ||
              ""
            ).toLowerCase() !==
            "cancelado"
        ),
      [
        ventasFiltradas,
      ]
    );


  const ventasHoy =
    useMemo(
      () =>
        ventasValidas.filter(
          esDeHoy
        ),
      [
        ventasValidas,
      ]
    );


  const totalVentasHoy =
    useMemo(
      () =>
        ventasHoy.reduce(
          (
            total,
            venta
          ) =>
            total +
            Number(
              venta.total ||
              venta.totalFinal ||
              0
            ),
          0
        ),
      [
        ventasHoy,
      ]
    );


  const totalEfectivoHoy =
    useMemo(
      () =>
        ventasHoy.reduce(
          (
            total,
            venta
          ) => {

            const medio =
              normalizarTexto(
                venta.metodoPago ||
                venta.formaPago ||
                ""
              );


            if (
              medio.includes(
                "efectivo"
              )
            ) {

              return (
                total +
                Number(
                  venta.total ||
                  venta.totalFinal ||
                  0
                )
              );

            }


            return total;

          },
          0
        ),
      [
        ventasHoy,
      ]
    );


  const totalTransferenciaHoy =
    useMemo(
      () =>
        ventasHoy.reduce(
          (
            total,
            venta
          ) => {

            const medio =
              normalizarTexto(
                venta.metodoPago ||
                venta.formaPago ||
                ""
              );


            if (
              medio.includes(
                "transfer"
              )
            ) {

              return (
                total +
                Number(
                  venta.total ||
                  venta.totalFinal ||
                  0
                )
              );

            }


            return total;

          },
          0
        ),
      [
        ventasHoy,
      ]
    );


  const ticketPromedio =
    ventasHoy.length > 0
      ? totalVentasHoy /
        ventasHoy.length
      : 0;


  /* ====================================================
     RESUMEN DE DELIVERY
  ==================================================== */

  const deliveriesPendientes =
    useMemo(
      () =>
        deliveriesFiltrados.filter(
          pedido => {

            const estado =
              normalizarTexto(
                pedido.estado ||
                "pendiente"
              );


            return (
              estado ===
                "pendiente" ||
              estado ===
                "nuevo"
            );

          }
        ),
      [
        deliveriesFiltrados,
      ]
    );


  const deliveriesEnCamino =
    useMemo(
      () =>
        deliveriesFiltrados.filter(
          pedido => {

            const estado =
              normalizarTexto(
                pedido.estado ||
                ""
              );


            return (
              estado.includes(
                "camino"
              ) ||
              estado.includes(
                "aceptado"
              ) ||
              estado.includes(
                "reparto"
              )
            );

          }
        ),
      [
        deliveriesFiltrados,
      ]
    );


  /* ====================================================
     STOCK
  ==================================================== */

  const productosSinStock =
    useMemo(
      () =>
        productosFiltrados.filter(
          producto =>
            Number(
              producto.stock ||
              0
            ) <= 0
        ),
      [
        productosFiltrados,
      ]
    );


  const productosStockBajo =
    useMemo(
      () =>
        productosFiltrados.filter(
          producto => {

            const stock =
              Number(
                producto.stock ||
                0
              );


            return (
              stock > 0 &&
              stock <= 5
            );

          }
        ),
      [
        productosFiltrados,
      ]
    );


  /* ====================================================
     PRODUCCIÓN SEMANAL
  ==================================================== */

  const produccionesSemana =
    useMemo(
      () => {

        return producciones.filter(
          produccion => {

            if (
              filtroSucursal !==
              "todas" &&
              produccion.sucursalId !==
                filtroSucursal
            ) {
              return false;
            }


            if (
              !produccion.fecha
            ) {
              return false;
            }


            let fecha;


            try {

              fecha =
                typeof produccion
                  .fecha
                  .toDate ===
                  "function"

                  ? produccion
                      .fecha
                      .toDate()

                  : new Date(
                      produccion.fecha
                    );

            } catch {

              return false;

            }


            return (
              fecha >=
                inicioSemana &&
              fecha <=
                finSemana
            );

          }
        );

      },
      [
        producciones,
        filtroSucursal,
        inicioSemana,
        finSemana,
      ]
    );


  /* ====================================================
     RESUMEN POR EMPLEADA
  ==================================================== */

  const resumenEmpleadas =
    useMemo(
      () => {

        const mapa =
          {};


        empleadas.forEach(
          empleada => {

            mapa[
              empleada.id
            ] = {

              empleadaId:
                empleada.id,

              nombre:
                empleada.nombre,

              precioDocena:
                Number(
                  empleada.precioDocena ||
                  0
                ),

              activa:
                empleada.activa !==
                false,

              totalEmpanadas:
                0,

              totalDocenas:
                0,

              totalAPagar:
                0,

              variedades:
                {},

              producciones:
                [],

            };


            VARIEDADES.forEach(
              variedad => {

                mapa[
                  empleada.id
                ].variedades[
                  variedad.clave
                ] = {

                  nombre:
                    variedad.nombre,

                  cantidad:
                    0,

                  docenas:
                    0,

                };

              }
            );

          }
        );


        produccionesSemana.forEach(
          produccion => {

            const empleadaId =
              produccion.empleadaId;


            if (!empleadaId) {
              return;
            }


            if (
              !mapa[
                empleadaId
              ]
            ) {

              mapa[
                empleadaId
              ] = {

                empleadaId,

                nombre:
                  produccion.empleada ||
                  empleadaId,

                precioDocena:
                  0,

                activa:
                  true,

                totalEmpanadas:
                  0,

                totalDocenas:
                  0,

                totalAPagar:
                  0,

                variedades:
                  {},

                producciones:
                  [],

              };


              VARIEDADES.forEach(
                variedad => {

                  mapa[
                    empleadaId
                  ].variedades[
                    variedad.clave
                  ] = {

                    nombre:
                      variedad.nombre,

                    cantidad:
                      0,

                    docenas:
                      0,

                  };

                }
              );

            }


            mapa[
              empleadaId
            ].producciones.push(
              produccion
            );


            const variedades =
              produccion.variedades ||
              {};


            Object.entries(
              variedades
            ).forEach(
              ([
                clave,
                datos,
              ]) => {

                if (
                  !mapa[
                    empleadaId
                  ].variedades[
                    clave
                  ]
                ) {

                  mapa[
                    empleadaId
                  ].variedades[
                    clave
                  ] = {

                    nombre:
                      datos.nombre ||
                      clave,

                    cantidad:
                      0,

                    docenas:
                      0,

                  };

                }


                mapa[
                  empleadaId
                ].variedades[
                  clave
                ].cantidad +=
                  Number(
                    datos.cantidad ||
                    0
                  );


                mapa[
                  empleadaId
                ].variedades[
                  clave
                ].docenas +=
                  Number(
                    datos.docenas ||
                    0
                  );

              }
            );


            mapa[
              empleadaId
            ].totalEmpanadas +=
              Number(
                produccion.totalEmpanadas ||
                0
              );


            mapa[
              empleadaId
            ].totalDocenas +=
              Number(
                produccion.totalDocenas ||
                0
              );

          }
        );


        Object.values(
          mapa
        ).forEach(
          item => {

            item.totalAPagar =
              Number(
                item.totalDocenas ||
                0
              ) *
              Number(
                item.precioDocena ||
                0
              );

          }
        );


        return Object.values(
          mapa
        ).sort(
          (a, b) =>
            String(
              a.nombre
            ).localeCompare(
              String(
                b.nombre
              ),
              "es"
            )
        );

      },
      [
        empleadas,
        produccionesSemana,
      ]
    );


  /* ====================================================
     TOTAL PRODUCCIÓN SEMANAL
  ==================================================== */

  const totalProduccionSemana =
    useMemo(
      () =>
        resumenEmpleadas.reduce(
          (
            total,
            empleada
          ) =>
            total +
            Number(
              empleada.totalEmpanadas ||
              0
            ),
          0
        ),
      [
        resumenEmpleadas,
      ]
    );


  const totalDocenasSemana =
    totalProduccionSemana /
    12;


  const totalPagoSemana =
    useMemo(
      () =>
        resumenEmpleadas.reduce(
          (
            total,
            empleada
          ) =>
            total +
            Number(
              empleada.totalAPagar ||
              0
            ),
          0
        ),
      [
        resumenEmpleadas,
      ]
    );


  /* ====================================================
     GUARDAR CONFIGURACIÓN DE SUCURSAL
  ==================================================== */

  const guardarConfiguracion =
    async () => {

      if (
        !configSucursalId
      ) {
        return;
      }


      setGuardandoConfiguracion(
        true
      );


      try {

        await setDoc(
          doc(
            db,
            "sucursales",
            configSucursalId,
            "configuracion",
            "general"
          ),

          {
            ...configuracion,

            precioDelivery:
              Number(
                configuracion
                  .precioDelivery ||
                0
              ),

            actualizadoEn:
              serverTimestamp(),
          },

          {
            merge: true,
          }
        );


        Swal.fire({
          icon: "success",
          title:
            "Configuración guardada",
          text:
            SUCURSALES[
              configSucursalId
            ]?.nombre ||
            configSucursalId,
          timer: 1400,
          showConfirmButton:
            false,
        });

      } catch (error) {

        console.error(
          "Error guardando configuración:",
          error
        );


        Swal.fire({
          icon: "error",
          title:
            "No se pudo guardar la configuración",
        });

      } finally {

        setGuardandoConfiguracion(
          false
        );

      }

    };


  /* ====================================================
     ACTUALIZAR STOCK MANUALMENTE
  ==================================================== */

  const actualizarStock =
    async (
      producto,
      nuevoStock
    ) => {

      const stock =
        Number(
          nuevoStock
        );


      if (
        !Number.isFinite(
          stock
        ) ||
        stock < 0
      ) {

        Swal.fire({
          icon: "error",
          title:
            "Stock inválido",
        });

        return;
      }


      try {

        await runTransaction(
          db,

          async transaction => {

            const productoRef =
              doc(
                db,
                "sucursales",
                producto.sucursalId,
                "productos",
                producto.id
              );


            const snapshot =
              await transaction.get(
                productoRef
              );


            if (
              !snapshot.exists()
            ) {

              throw new Error(
                "El producto no existe."
              );

            }


            const stockAnterior =
              Number(
                snapshot.data()
                  .stock ||
                0
              );


            transaction.update(
              productoRef,

              {
                stock,

                actualizadoEn:
                  serverTimestamp(),
              }
            );


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
                tipo:
                  "ajuste_manual",

                origen:
                  "admin",

                productoId:
                  producto.id,

                producto:
                  producto.Nombre ||
                  producto.nombre ||
                  producto.id,

                sucursalId:
                  producto.sucursalId,

                sucursalNombre:
                  SUCURSALES[
                    producto.sucursalId
                  ]?.nombre ||
                  producto.sucursalId,

                stockAnterior,

                stockNuevo:
                  stock,

                cantidad:
                  stock -
                  stockAnterior,

                fecha:
                  serverTimestamp(),
              }
            );

          }
        );


        Swal.fire({
          icon: "success",
          title:
            "Stock actualizado",
          timer: 1000,
          showConfirmButton:
            false,
        });

      } catch (error) {

        console.error(
          error
        );


        Swal.fire({
          icon: "error",
          title:
            "No se pudo actualizar el stock",
          text:
            error?.message ||
            "Volvé a intentar.",
        });

      }

    };


  /* ====================================================
     CAMBIAR STOCK DESDE PROMPT
  ==================================================== */

  const editarStock =
    async producto => {

      const resultado =
        await Swal.fire({

          title:
            producto.Nombre ||
            producto.nombre ||
            "Producto",

          text:
            `Stock actual: ${Number(
              producto.stock ||
              0
            )}`,

          input:
            "number",

          inputValue:
            Number(
              producto.stock ||
              0
            ),

          inputAttributes: {
            min: "0",
            step: "0.5",
          },

          showCancelButton:
            true,

          confirmButtonText:
            "Guardar stock",

          cancelButtonText:
            "Cancelar",

          confirmButtonColor:
            "#2F6B4F",

          preConfirm:
            valor => {

              const numero =
                Number(
                  valor
                );


              if (
                !Number.isFinite(
                  numero
                ) ||
                numero < 0
              ) {

                Swal.showValidationMessage(
                  "Ingresá un stock válido."
                );

                return false;
              }


              return numero;

            },

        });


      if (
        resultado.isConfirmed
      ) {

        await actualizarStock(
          producto,
          resultado.value
        );

      }

    };


  



  /* ====================================================
     MARCAR PAGO SEMANAL
  ==================================================== */

  const marcarPagoSemana =
    async empleadaResumen => {

      const empleadaId =
        empleadaResumen
          .empleadaId;


      const pagoId =
        `${semanaId}_${empleadaId}`;


      setMarcandoPago(
        empleadaId
      );


      try {

        await setDoc(
          doc(
            db,
            "pagosProduccion",
            pagoId
          ),

          {
            semanaId,

            semanaInicio:
              fechaISO(
                inicioSemana
              ),

            semanaFin:
              fechaISO(
                finSemana
              ),

            empleadaId,

            empleada:
              empleadaResumen
                .nombre,

            sucursalId:
              filtroSucursal,

            totalEmpanadas:
              Number(
                empleadaResumen
                  .totalEmpanadas ||
                0
              ),

            totalDocenas:
              Number(
                empleadaResumen
                  .totalDocenas ||
                0
              ),

            precioDocena:
              Number(
                empleadaResumen
                  .precioDocena ||
                0
              ),

            totalPagado:
              Number(
                empleadaResumen
                  .totalAPagar ||
                0
              ),

            estado:
              "pagado",

            pagadoEn:
              serverTimestamp(),

            actualizadoEn:
              serverTimestamp(),
          },

          {
            merge: true,
          }
        );


        Swal.fire({
          icon: "success",
          title:
            "Pago registrado",
          text:
            `${empleadaResumen.nombre}: ${dinero(
              empleadaResumen
                .totalAPagar
            )}`,
          timer: 1500,
          showConfirmButton:
            false,
        });

      } catch (error) {

        console.error(
          error
        );


        Swal.fire({
          icon: "error",
          title:
            "No se pudo registrar el pago",
        });

      } finally {

        setMarcandoPago(
          null
        );

      }

    };


  /* ====================================================
     ABRIR WEB COMO SUCURSAL
  ==================================================== */

  const abrirSucursal =
    sucursalId => {

      const sucursal =
        SUCURSALES[
          sucursalId
        ];


      if (!sucursal) {
        return;
      }


      elegirSucursal(
        sucursal
      );


      router.push("/");

    };


  /* ====================================================
     IR A PRODUCTOS
  ==================================================== */

  const irAgregarProducto =
    sucursalId => {

      const sucursal =
        SUCURSALES[
          sucursalId
        ];


      if (!sucursal) {
        return;
      }


      elegirSucursal(
        sucursal
      );


      router.push(
        "/admin/agregar-producto"
      );

    };


  const irEditarProducto =
    producto => {

      const sucursal =
        SUCURSALES[
          producto.sucursalId
        ];


      if (!sucursal) {
        return;
      }


      elegirSucursal(
        sucursal
      );


      router.push(`/admin/editarProducto/${producto.id}`);

    };


  /* ====================================================
     PANTALLAS DE SEGURIDAD
  ==================================================== */

  if (!user) {

    return (

      <div className="min-h-screen bg-[#1B120D] text-white flex items-center justify-center p-6">

        <div className="text-center">

          <p className="text-2xl font-black">
            Cargando panel...
          </p>

        </div>

      </div>

    );

  }


  if (!esAdmin) {

    return null;

  }


  /* ====================================================
     COMPONENTES VISUALES INTERNOS
  ==================================================== */

  const TarjetaResumen = ({
    titulo,
    valor,
    detalle,
    icono,
  }) => (

    <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-5">

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-xs uppercase tracking-[0.18em] font-black text-gray-400">
            {titulo}
          </p>

          <p className="text-3xl font-black text-[#1B120D] mt-2">
            {valor}
          </p>

          {detalle && (
            <p className="text-sm text-gray-500 mt-2">
              {detalle}
            </p>
          )}

        </div>

        <div className="text-3xl">
          {icono}
        </div>

      </div>

    </div>

  );


  const BotonMenu = ({
    id,
    icono,
    texto,
  }) => (

    <button
      type="button"
      onClick={() =>
        setSeccion(id)
      }
      className={`
        w-full
        flex
        items-center
        gap-3
        px-4
        py-3
        rounded-2xl
        text-left
        font-black
        transition

        ${
          seccion === id
            ? "bg-[#E7C873] text-[#1B120D]"
            : "text-white/75 hover:bg-white/10 hover:text-white"
        }
      `}
    >

      <span className="text-xl">
        {icono}
      </span>

      <span>
        {texto}
      </span>

    </button>

  );


  /* ====================================================
     RENDER
  ==================================================== */

  return (

    <div className="min-h-screen bg-[#F4F1EC] text-[#1B120D]">

      <div className="flex min-h-screen">

        {/* SIDEBAR */}

        <aside className="hidden lg:flex w-72 bg-[#1B120D] text-white p-5 flex-col">

          <div className="mb-7">

            <p className="text-[#E7C873] uppercase tracking-[0.25em] text-xs font-black">
              Pizzería Jope
            </p>

            <h1 className="text-3xl font-black mt-2">
              Panel Dueña
            </h1>

            <p className="text-white/50 text-sm mt-2">
              Control general del negocio
            </p>

          </div>


          <nav className="space-y-2">

            <BotonMenu
              id="resumen"
              icono="🏠"
              texto="Resumen"
            />

            <BotonMenu
              id="ventas"
              icono="💰"
              texto="Ventas"
            />

            <BotonMenu
              id="produccion"
              icono="🥟"
              texto="Producción"
            />

            <BotonMenu
              id="empleadas"
              icono="👥"
              texto="Empleadas"
            />

            <BotonMenu
              id="stock"
              icono="📦"
              texto="Stock"
            />

            <BotonMenu
              id="delivery"
              icono="🛵"
              texto="Delivery"
            />
          <BotonMenu
  id="repartidores"
  icono="👤"
  texto="Repartidores"
/>
            <BotonMenu
              id="productos"
              icono="🍕"
              texto="Productos"
            />

            <BotonMenu
              id="promos"
              icono="🔥"
              texto="Promos"
            />

            <BotonMenu
              id="configuracion"
              icono="⚙️"
              texto="Configuración"
            />

            <BotonMenu
              id="movimientos"
              icono="📚"
              texto="Movimientos"
            />

          </nav>


          <div className="mt-auto pt-6">

            <p className="text-xs text-white/40">
              Administradora
            </p>

            <p className="font-bold text-sm mt-1 break-all">
              {user.email}
            </p>

          </div>

        </aside>


        {/* CONTENIDO */}

        <main className="flex-1 min-w-0">

          {/* HEADER */}

          <header className="bg-white border-b border-black/5 sticky top-0 z-30">

            <div className="px-4 md:px-7 py-4">

              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">

                <div>

                  <p className="text-xs uppercase tracking-[0.2em] font-black text-[#2F6B4F]">
                    Administración
                  </p>

                  <h2 className="text-2xl md:text-3xl font-black">
                    Pizzería Jope
                  </h2>

                </div>


                <div className="flex flex-wrap gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      setFiltroSucursal(
                        "todas"
                      )
                    }
                    className={`
                      px-4
                      py-2.5
                      rounded-xl
                      font-black
                      text-sm

                      ${
                        filtroSucursal ===
                        "todas"
                          ? "bg-[#1B120D] text-white"
                          : "bg-gray-100 text-gray-600"
                      }
                    `}
                  >
                    Todas
                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      setFiltroSucursal(
                        "luiggi"
                      )
                    }
                    className={`
                      px-4
                      py-2.5
                      rounded-xl
                      font-black
                      text-sm

                      ${
                        filtroSucursal ===
                        "luiggi"
                          ? "bg-[#7A4E35] text-white"
                          : "bg-gray-100 text-gray-600"
                      }
                    `}
                  >
                    Luiggi
                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      setFiltroSucursal(
                        "santa_rosa"
                      )
                    }
                    className={`
                      px-4
                      py-2.5
                      rounded-xl
                      font-black
                      text-sm

                      ${
                        filtroSucursal ===
                        "santa_rosa"
                          ? "bg-[#2F6B4F] text-white"
                          : "bg-gray-100 text-gray-600"
                      }
                    `}
                  >
                    Santa Rosa
                  </button>

                </div>

              </div>


              {/* MENÚ MÓVIL */}

              <div className="lg:hidden flex gap-2 overflow-x-auto mt-4 pb-1">

                {[
  ["resumen", "🏠", "Resumen"],
  ["ventas", "💰", "Ventas"],
  ["produccion", "🥟", "Producción"],
  ["empleadas", "👥", "Empleadas"],
  ["stock", "📦", "Stock"],
  ["delivery", "🛵", "Delivery"],
  ["repartidores", "👤", "Repartidores"],
  ["productos", "🍕", "Productos"],
  ["promos", "🔥", "Promos"],
  ["configuracion", "⚙️", "Config."],
  ["movimientos", "📚", "Movimientos"],
].map(
                  ([
                    id,
                    icono,
                    texto,
                  ]) => (

                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        setSeccion(
                          id
                        )
                      }
                      className={`
                        whitespace-nowrap
                        px-3
                        py-2
                        rounded-xl
                        text-sm
                        font-black

                        ${
                          seccion === id
                            ? "bg-[#1B120D] text-white"
                            : "bg-gray-100 text-gray-600"
                        }
                      `}
                    >
                      {icono} {texto}
                    </button>

                  )
                )}

              </div>

            </div>

          </header>


          <div className="p-4 md:p-7">

            {error && (

              <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 font-bold">
                {error}
              </div>

            )}


            {cargando && (

              <div className="mb-5 bg-white rounded-2xl p-4 border border-black/5">
                Cargando movimientos del negocio...
              </div>

            )}


            {/* =============================================
                RESUMEN
            ============================================= */}

            {seccion ===
              "resumen" && (

              <div className="space-y-6">

                <div>

                  <p className="text-sm font-black text-[#2F6B4F] uppercase tracking-[0.18em]">
                    Vista general
                  </p>

                  <h2 className="text-3xl md:text-4xl font-black mt-1">
                    Resumen del negocio
                  </h2>

                  <p className="text-gray-500 mt-2">
                    {filtroSucursal ===
                    "todas"
                      ? "Todas las sucursales"
                      : SUCURSALES[
                          filtroSucursal
                        ]?.nombre}
                  </p>

                </div>


                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">

                  <TarjetaResumen
                    titulo="Ventas hoy"
                    valor={dinero(
                      totalVentasHoy
                    )}
                    detalle={`${ventasHoy.length} ventas`}
                    icono="💰"
                  />

                  <TarjetaResumen
                    titulo="Ticket promedio"
                    valor={dinero(
                      ticketPromedio
                    )}
                    detalle="Promedio de hoy"
                    icono="🧾"
                  />

                  <TarjetaResumen
                    titulo="Delivery pendiente"
                    valor={
                      deliveriesPendientes.length
                    }
                    detalle={`${deliveriesEnCamino.length} en camino`}
                    icono="🛵"
                  />

                  <TarjetaResumen
                    titulo="Sin stock"
                    valor={
                      productosSinStock.length
                    }
                    detalle={`${productosStockBajo.length} con stock bajo`}
                    icono="📦"
                  />

                </div>


                <div className="grid lg:grid-cols-2 gap-5">

                  <section className="bg-white rounded-3xl border border-black/5 shadow-sm p-5">

                    <h3 className="text-xl font-black">
                      💳 Cobros de hoy
                    </h3>

                    <div className="space-y-4 mt-5">

                      <div className="flex justify-between gap-4 border-b pb-3">
                        <span className="text-gray-500">
                          Efectivo
                        </span>

                        <b>
                          {dinero(
                            totalEfectivoHoy
                          )}
                        </b>
                      </div>

                      <div className="flex justify-between gap-4 border-b pb-3">
                        <span className="text-gray-500">
                          Transferencias
                        </span>

                        <b>
                          {dinero(
                            totalTransferenciaHoy
                          )}
                        </b>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="font-black">
                          Total
                        </span>

                        <b className="text-xl text-[#2F6B4F]">
                          {dinero(
                            totalVentasHoy
                          )}
                        </b>
                      </div>

                    </div>

                  </section>


                  <section className="bg-white rounded-3xl border border-black/5 shadow-sm p-5">

                    <h3 className="text-xl font-black">
                      🥟 Producción semanal
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      {formatoFecha(
                        inicioSemana
                      )}{" "}
                      al{" "}
                      {formatoFecha(
                        finSemana
                      )}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mt-5">

                      <div className="bg-[#F8F5EF] rounded-2xl p-4">
                        <p className="text-gray-500 text-sm">
                          Empanadas
                        </p>

                        <p className="text-3xl font-black mt-1">
                          {totalProduccionSemana}
                        </p>
                      </div>

                      <div className="bg-[#F8F5EF] rounded-2xl p-4">
                        <p className="text-gray-500 text-sm">
                          Docenas
                        </p>

                        <p className="text-3xl font-black mt-1">
                          {totalDocenasSemana.toFixed(
                            2
                          )}
                        </p>
                      </div>

                    </div>

                    <div className="flex justify-between items-center mt-5 pt-4 border-t">
                      <span className="font-bold text-gray-500">
                        A pagar
                      </span>

                      <b className="text-2xl text-[#7A4E35]">
                        {dinero(
                          totalPagoSemana
                        )}
                      </b>
                    </div>

                  </section>

                </div>


                <section className="bg-white rounded-3xl border border-black/5 shadow-sm p-5">

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                    <div>
                      <h3 className="text-xl font-black">
                        ⚡ Accesos rápidos
                      </h3>

                      <p className="text-gray-500 text-sm mt-1">
                        Abrí o administrá cada sucursal.
                      </p>
                    </div>

                  </div>


                  <div className="grid md:grid-cols-2 gap-4 mt-5">

                    <div className="border rounded-2xl p-4">

                      <h4 className="font-black text-lg">
                        Ingeniero Luiggi
                      </h4>

                      <div className="flex flex-wrap gap-2 mt-4">

                        <button
                          type="button"
                          onClick={() =>
                            abrirSucursal(
                              "luiggi"
                            )
                          }
                          className="bg-[#1B120D] text-white px-4 py-2 rounded-xl font-black"
                        >
                          Ver web
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            irAgregarProducto(
                              "luiggi"
                            )
                          }
                          className="bg-[#7A4E35] text-white px-4 py-2 rounded-xl font-black"
                        >
                          + Producto
                        </button>

                      </div>

                    </div>


                    <div className="border rounded-2xl p-4">

                      <h4 className="font-black text-lg">
                        Santa Rosa
                      </h4>

                      <div className="flex flex-wrap gap-2 mt-4">

                        <button
                          type="button"
                          onClick={() =>
                            abrirSucursal(
                              "santa_rosa"
                            )
                          }
                          className="bg-[#1B120D] text-white px-4 py-2 rounded-xl font-black"
                        >
                          Ver web
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            irAgregarProducto(
                              "santa_rosa"
                            )
                          }
                          className="bg-[#2F6B4F] text-white px-4 py-2 rounded-xl font-black"
                        >
                          + Producto
                        </button>

                      </div>

                    </div>

                  </div>

                </section>

              </div>

            )}


            {/* =============================================
                VENTAS
            ============================================= */}

            {seccion ===
              "ventas" && (

              <div className="space-y-5">

                <div>

                  <p className="text-sm font-black text-[#2F6B4F] uppercase tracking-[0.18em]">
                    Caja y facturación
                  </p>

                  <h2 className="text-3xl font-black mt-1">
                    Ventas
                  </h2>

                </div>


                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

                  <TarjetaResumen
                    titulo="Ventas hoy"
                    valor={
                      ventasHoy.length
                    }
                    detalle="Operaciones"
                    icono="🧾"
                  />

                  <TarjetaResumen
                    titulo="Total hoy"
                    valor={dinero(
                      totalVentasHoy
                    )}
                    detalle="Sin canceladas"
                    icono="💰"
                  />

                  <TarjetaResumen
                    titulo="Efectivo"
                    valor={dinero(
                      totalEfectivoHoy
                    )}
                    detalle="Hoy"
                    icono="💵"
                  />

                  <TarjetaResumen
                    titulo="Transferencia"
                    valor={dinero(
                      totalTransferenciaHoy
                    )}
                    detalle="Hoy"
                    icono="📲"
                  />

                </div>


                <section className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">

                  <div className="p-5 border-b">

                    <h3 className="text-xl font-black">
                      Últimas ventas
                    </h3>

                  </div>


                  <div className="overflow-x-auto">

                    <table className="w-full text-sm">

                      <thead className="bg-[#F8F5EF] text-left">

                        <tr>

                          <th className="p-4">
                            Fecha
                          </th>

                          <th className="p-4">
                            Sucursal
                          </th>

                          <th className="p-4">
                            Cliente
                          </th>

                          <th className="p-4">
                            Tipo
                          </th>

                          <th className="p-4">
                            Pago
                          </th>

                          <th className="p-4 text-right">
                            Total
                          </th>

                          <th className="p-4">
                            Estado
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {ventasFiltradas
                          .slice(
                            0,
                            100
                          )
                          .map(
                            venta => (

                              <tr
                                key={
                                  venta.id
                                }
                                className="border-t"
                              >

                                <td className="p-4 whitespace-nowrap">
                                  {fechaHora(
                                    venta.fecha ||
                                    venta.fechaServidor ||
                                    venta.fechaLocal
                                  )}
                                </td>

                                <td className="p-4">
                                  {SUCURSALES[
                                    venta.sucursalId
                                  ]?.nombre ||
                                    venta.sucursalNombre ||
                                    venta.sucursalId ||
                                    "-"}
                                </td>

                                <td className="p-4">
                                  {venta.cliente ||
                                    venta.nombreCliente ||
                                    "Mostrador"}
                                </td>

                                <td className="p-4">
                                  {venta.tipo ||
                                    venta.tipoPedido ||
                                    "-"}
                                </td>

                                <td className="p-4">
                                  {venta.metodoPago ||
                                    venta.formaPago ||
                                    "-"}
                                </td>

                                <td className="p-4 text-right font-black">
                                  {dinero(
                                    venta.total ||
                                    venta.totalFinal ||
                                    0
                                  )}
                                </td>

                                <td className="p-4">
                                  <span
                                    className={`
                                      px-3
                                      py-1
                                      rounded-full
                                      text-xs
                                      font-black

                                      ${
                                        normalizarTexto(
                                          venta.estado
                                        ) ===
                                        "cancelado"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-green-100 text-green-700"
                                      }
                                    `}
                                  >
                                    {venta.estado ||
                                      "Activo"}
                                  </span>
                                </td>

                              </tr>

                            )
                          )}

                      </tbody>

                    </table>

                  </div>

                </section>


                <div className="grid lg:grid-cols-2 gap-5">

                  <section className="bg-white rounded-3xl border border-black/5 shadow-sm p-5">

                    <h3 className="text-xl font-black">
                      🔒 Cierres de caja
                    </h3>

                    <div className="space-y-3 mt-4 max-h-[420px] overflow-y-auto">

                      {cierresFiltrados.length ===
                      0 ? (

                        <p className="text-gray-500">
                          No hay cierres registrados.
                        </p>

                      ) : (

                        cierresFiltrados
                          .slice(
                            0,
                            50
                          )
                          .map(
                            cierre => (

                              <div
                                key={
                                  cierre.id
                                }
                                className="border rounded-2xl p-4"
                              >

                                <div className="flex justify-between gap-4">

                                  <div>

                                    <p className="font-black">
                                      {cierre.sucursalNombre ||
                                        SUCURSALES[
                                          cierre.sucursalId
                                        ]?.nombre ||
                                        "Sucursal"}
                                    </p>

                                    <p className="text-sm text-gray-500 mt-1">
                                      {fechaHora(
                                        cierre.fecha
                                      )}
                                    </p>

                                  </div>

                                  <p className="text-xl font-black text-[#2F6B4F]">
                                    {dinero(
                                      cierre.total ||
                                      cierre.totalVentas ||
                                      cierre.totalCaja ||
                                      0
                                    )}
                                  </p>

                                </div>

                              </div>

                            )
                          )

                      )}

                    </div>

                  </section>


                  <section className="bg-white rounded-3xl border border-black/5 shadow-sm p-5">

                    <h3 className="text-xl font-black">
                      ❌ Cancelaciones
                    </h3>

                    <div className="space-y-3 mt-4 max-h-[420px] overflow-y-auto">

                      {cancelacionesFiltradas.length ===
                      0 ? (

                        <p className="text-gray-500">
                          No hay cancelaciones registradas.
                        </p>

                      ) : (

                        cancelacionesFiltradas
                          .slice(
                            0,
                            50
                          )
                          .map(
                            cancelacion => (

                              <div
                                key={
                                  cancelacion.id
                                }
                                className="border border-red-100 bg-red-50/50 rounded-2xl p-4"
                              >

                                <div className="flex justify-between gap-4">

                                  <div>

                                    <p className="font-black">
                                      {cancelacion.cliente ||
                                        cancelacion.nombreCliente ||
                                        "Venta cancelada"}
                                    </p>

                                    <p className="text-sm text-gray-500 mt-1">
                                      {fechaHora(
                                        cancelacion.fecha
                                      )}
                                    </p>

                                    {cancelacion.motivo && (
                                      <p className="text-sm text-red-700 mt-2">
                                        {cancelacion.motivo}
                                      </p>
                                    )}

                                  </div>

                                  <p className="font-black text-red-700">
                                    {dinero(
                                      cancelacion.total ||
                                      0
                                    )}
                                  </p>

                                </div>

                              </div>

                            )
                          )

                      )}

                    </div>

                  </section>

                </div>

              </div>

            )}            {/* =============================================
                PRODUCCIÓN
            ============================================= */}

            {seccion ===
              "produccion" && (

              <div className="space-y-5">

                <div>

                  <p className="text-sm font-black text-[#2F6B4F] uppercase tracking-[0.18em]">
                    Producción de empanadas
                  </p>

                  <h2 className="text-3xl font-black mt-1">
                    Producción semanal
                  </h2>

                  <p className="text-gray-500 mt-2">
                    Semana del{" "}
                    <b>
                      {formatoFecha(
                        inicioSemana
                      )}
                    </b>
                    {" "}al{" "}
                    <b>
                      {formatoFecha(
                        finSemana
                      )}
                    </b>
                  </p>

                </div>


                {/* TOTALES */}

                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">

                  <TarjetaResumen
                    titulo="Empanadas"
                    valor={
                      totalProduccionSemana
                    }
                    detalle="Esta semana"
                    icono="🥟"
                  />

                  <TarjetaResumen
                    titulo="Docenas"
                    valor={
                      totalDocenasSemana.toFixed(
                        2
                      )
                    }
                    detalle="Esta semana"
                    icono="📦"
                  />

                  <TarjetaResumen
                    titulo="A pagar"
                    valor={dinero(
                      totalPagoSemana
                    )}
                    detalle="Mano de obra"
                    icono="💸"
                  />

                  <TarjetaResumen
                    titulo="Empleadas"
                    valor={
                      resumenEmpleadas.filter(
                        empleada =>
                          empleada.activa
                      ).length
                    }
                    detalle="Activas"
                    icono="👩‍🍳"
                  />

                </div>


                {/* EMPLEADAS */}

                <div className="grid xl:grid-cols-2 gap-5">

                  {resumenEmpleadas.map(
                    resumen => {

                      const tieneProduccion =
                        Number(
                          resumen.totalEmpanadas ||
                          0
                        ) !== 0;


                      return (

                        <article
                          key={
                            resumen.empleadaId
                          }
                          className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden"
                        >

                          <div className="p-5 border-b bg-[#FAFAFA]">

                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                              <div>

                                <p className="text-xs uppercase tracking-[0.18em] text-gray-400 font-black">
                                  Empleada
                                </p>

                                <h3 className="text-2xl font-black mt-1">
                                  {
                                    resumen.nombre
                                  }
                                </h3>

                                <p className="text-sm text-gray-500 mt-1">
                                  Pago por docena:{" "}
                                  <b>
                                    {dinero(
                                      resumen.precioDocena
                                    )}
                                  </b>
                                </p>

                              </div>


                              <span
                                className={`
                                  h-fit
                                  px-3
                                  py-1.5
                                  rounded-full
                                  text-xs
                                  font-black

                                  ${
                                    tieneProduccion
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-100 text-gray-500"
                                  }
                                `}
                              >
                                {tieneProduccion
                                  ? "CON PRODUCCIÓN"
                                  : "SIN PRODUCCIÓN"}
                              </span>

                            </div>


                            <div className="grid grid-cols-3 gap-2 mt-5">

                              <div className="bg-white rounded-xl p-3 border">

                                <p className="text-xs text-gray-500">
                                  Empanadas
                                </p>

                                <p className="text-xl font-black">
                                  {
                                    resumen.totalEmpanadas
                                  }
                                </p>

                              </div>


                              <div className="bg-white rounded-xl p-3 border">

                                <p className="text-xs text-gray-500">
                                  Docenas
                                </p>

                                <p className="text-xl font-black">
                                  {Number(
                                    resumen.totalDocenas ||
                                    0
                                  ).toFixed(
                                    2
                                  )}
                                </p>

                              </div>


                              <div className="bg-white rounded-xl p-3 border">

                                <p className="text-xs text-gray-500">
                                  A pagar
                                </p>

                                <p className="text-lg font-black text-[#7A4E35]">
                                  {dinero(
                                    resumen.totalAPagar
                                  )}
                                </p>

                              </div>

                            </div>

                          </div>


                          <div className="p-5">

                            <h4 className="font-black mb-3">
                              Variedades
                            </h4>


                            <div className="space-y-2">

                              {VARIEDADES.map(
                                variedad => {

                                  const datos =
                                    resumen.variedades[
                                      variedad.clave
                                    ] || {
                                      cantidad:
                                        0,

                                      docenas:
                                        0,
                                    };


                                  return (

                                    <div
                                      key={
                                        variedad.clave
                                      }
                                      className="flex items-center justify-between gap-4 bg-[#F8F5EF] rounded-xl px-4 py-3"
                                    >

                                      <span className="font-bold">
                                        {
                                          variedad.nombre
                                        }
                                      </span>


                                      <div className="text-right">

                                        <p className="font-black text-[#2F6B4F]">
                                          {Number(
                                            datos.cantidad ||
                                            0
                                          )}{" "}
                                          un.
                                        </p>

                                        <p className="text-xs text-gray-500">
                                          {Number(
                                            datos.docenas ||
                                            0
                                          ).toFixed(
                                            2
                                          )}{" "}
                                          doc.
                                        </p>

                                      </div>

                                    </div>

                                  );

                                }
                              )}

                            </div>


                            <div className="mt-5 pt-4 border-t">

                              <button
                                type="button"
                                disabled={
                                  !tieneProduccion ||
                                  marcandoPago ===
                                    resumen.empleadaId
                                }
                                onClick={() =>
                                  marcarPagoSemana(
                                    resumen
                                  )
                                }
                                className="w-full bg-[#2F6B4F] disabled:bg-gray-300 text-white py-3 rounded-xl font-black"
                              >
                                {marcandoPago ===
                                resumen.empleadaId
                                  ? "Registrando..."
                                  : "✅ Registrar pago semanal"}
                              </button>

                            </div>

                          </div>

                        </article>

                      );

                    }
                  )}

                </div>

              </div>

            )}


            {/* =============================================
                EMPLEADAS
            ============================================= */}

            {seccion ===
              "empleadas" && (

              <EmpleadasPanel />

            )}


            {/* =============================================
                STOCK
            ============================================= */}

            {seccion ===
              "stock" && (

              <div className="space-y-5">

                <div>

                  <p className="text-sm font-black text-[#2F6B4F] uppercase tracking-[0.18em]">
                    Inventario
                  </p>

                  <h2 className="text-3xl font-black mt-1">
                    Stock
                  </h2>

                  <p className="text-gray-500 mt-2">
                    Stock compartido entre web, POS y producción.
                  </p>

                </div>


                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">

                  <TarjetaResumen
                    titulo="Productos"
                    valor={
                      productosFiltrados.length
                    }
                    detalle="En catálogo"
                    icono="🍕"
                  />

                  <TarjetaResumen
                    titulo="Sin stock"
                    valor={
                      productosSinStock.length
                    }
                    detalle="Requieren atención"
                    icono="🚨"
                  />

                  <TarjetaResumen
                    titulo="Stock bajo"
                    valor={
                      productosStockBajo.length
                    }
                    detalle="5 unidades o menos"
                    icono="⚠️"
                  />

                  <TarjetaResumen
                    titulo="Movimientos"
                    valor={
                      movimientosFiltrados.length
                    }
                    detalle="Registrados"
                    icono="📚"
                  />

                </div>


                <section className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">

                  <div className="p-5 border-b">

                    <h3 className="text-xl font-black">
                      Productos
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      Tocá “Editar stock” para hacer un ajuste manual.
                    </p>

                  </div>


                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 p-5">

                    {productosFiltrados.map(
                      producto => {

                        const stock =
                          Number(
                            producto.stock ||
                            0
                          );


                        return (

                          <article
                            key={
                              `${producto.sucursalId}-${producto.id}`
                            }
                            className={`
                              border
                              rounded-2xl
                              p-4

                              ${
                                stock <= 0
                                  ? "border-red-200 bg-red-50"
                                  : stock <= 5
                                  ? "border-yellow-200 bg-yellow-50"
                                  : "border-gray-200 bg-white"
                              }
                            `}
                          >

                            <div className="flex justify-between gap-4">

                              <div className="min-w-0">

                                <p className="font-black text-lg truncate">
                                  {producto.Nombre ||
                                    producto.nombre ||
                                    "Producto"}
                                </p>

                                <p className="text-xs text-gray-500 mt-1">
                                  {SUCURSALES[
                                    producto.sucursalId
                                  ]?.nombre ||
                                    producto.sucursalId}
                                </p>

                                <p className="text-sm font-bold text-[#7A4E35] mt-2">
                                  {dinero(
                                    producto.precio ||
                                    0
                                  )}
                                </p>

                              </div>


                              <div className="text-right">

                                <p
                                  className={`
                                    text-3xl
                                    font-black

                                    ${
                                      stock <= 0
                                        ? "text-red-600"
                                        : stock <= 5
                                        ? "text-yellow-600"
                                        : "text-[#2F6B4F]"
                                    }
                                  `}
                                >
                                  {stock}
                                </p>

                                <p className="text-xs text-gray-500">
                                  stock
                                </p>

                              </div>

                            </div>


                            <div className="grid grid-cols-2 gap-2 mt-4">

                              <button
                                type="button"
                                onClick={() =>
                                  editarStock(
                                    producto
                                  )
                                }
                                className="bg-[#1B120D] text-white py-2.5 rounded-xl font-black text-sm"
                              >
                                📦 Editar stock
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  irEditarProducto(
                                    producto
                                  )
                                }
                                className="bg-[#7A4E35] text-white py-2.5 rounded-xl font-black text-sm"
                              >
                                ✏️ Producto
                              </button>

                            </div>

                          </article>

                        );

                      }
                    )}


                    {productosFiltrados.length ===
                      0 && (

                      <div className="sm:col-span-2 xl:col-span-3 p-10 text-center">

                        <p className="text-gray-500">
                          No hay productos para mostrar.
                        </p>

                      </div>

                    )}

                  </div>

                </section>

              </div>

            )}


            {/* =============================================
                DELIVERY
            ============================================= */}

            {seccion ===
              "delivery" && (

              <div className="space-y-5">

                <div>

                  <p className="text-sm font-black text-[#2F6B4F] uppercase tracking-[0.18em]">
                    Repartos
                  </p>

                  <h2 className="text-3xl font-black mt-1">
                    Delivery
                  </h2>

                  <p className="text-gray-500 mt-2">
                    Seguimiento de pedidos enviados al repartidor.
                  </p>

                </div>


                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

                  <TarjetaResumen
                    titulo="Pendientes"
                    valor={
                      deliveriesPendientes.length
                    }
                    detalle="Esperando repartidor"
                    icono="⏳"
                  />

                  <TarjetaResumen
                    titulo="En camino"
                    valor={
                      deliveriesEnCamino.length
                    }
                    detalle="Pedidos en reparto"
                    icono="🛵"
                  />

                  <TarjetaResumen
                    titulo="Total registros"
                    valor={
                      deliveriesFiltrados.length
                    }
                    detalle="Según filtro"
                    icono="📍"
                  />

                </div>


                <section className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">

                  <div className="p-5 border-b">

                    <h3 className="text-xl font-black">
                      Pedidos Delivery
                    </h3>

                  </div>


                  <div className="divide-y">

                    {deliveriesFiltrados.length ===
                    0 ? (

                      <div className="p-10 text-center text-gray-500">
                        No hay pedidos de delivery.
                      </div>

                    ) : (

                      deliveriesFiltrados
                        .slice(
                          0,
                          100
                        )
                        .map(
                          pedido => {

                            const estado =
                              normalizarTexto(
                                pedido.estado ||
                                "pendiente"
                              );


                            return (

                              <article
                                key={
                                  pedido.id
                                }
                                className="p-5"
                              >

                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">

                                  <div className="min-w-0">

                                    <div className="flex flex-wrap items-center gap-2">

                                      <h4 className="font-black text-lg">
                                        {pedido.cliente ||
                                          pedido.nombreCliente ||
                                          "Cliente"}
                                      </h4>


                                      <span
                                        className={`
                                          px-3
                                          py-1
                                          rounded-full
                                          text-xs
                                          font-black

                                          ${
                                            estado.includes(
                                              "entregado"
                                            )
                                              ? "bg-green-100 text-green-700"
                                              : estado.includes(
                                                  "camino"
                                                ) ||
                                                estado.includes(
                                                  "aceptado"
                                                )
                                              ? "bg-blue-100 text-blue-700"
                                              : "bg-yellow-100 text-yellow-700"
                                          }
                                        `}
                                      >
                                        {pedido.estado ||
                                          "Pendiente"}
                                      </span>

                                    </div>


                                    <p className="text-sm text-gray-500 mt-2">
                                      📍{" "}
                                      {pedido.direccion ||
                                        pedido.customerAddress ||
                                        "Sin dirección"}
                                    </p>


                                    {pedido.telefono && (

                                      <p className="text-sm text-gray-500 mt-1">
                                        📱{" "}
                                        {pedido.telefono}
                                      </p>

                                    )}


                                    <p className="text-sm text-gray-500 mt-1">
                                      🏪{" "}
                                      {pedido.sucursalNombre ||
                                        SUCURSALES[
                                          pedido.sucursalId
                                        ]?.nombre ||
                                        pedido.sucursalId ||
                                        "-"}
                                    </p>


                                    <p className="text-xs text-gray-400 mt-2">
                                      {fechaHora(
                                        pedido.fecha
                                      )}
                                    </p>

                                  </div>


                                  <div className="lg:text-right">

                                    <p className="text-sm text-gray-500">
                                      Total
                                    </p>

                                    <p className="text-2xl font-black text-[#2F6B4F]">
                                      {dinero(
                                        pedido.total ||
                                        0
                                      )}
                                    </p>

                                  </div>

                                </div>

                              </article>

                            );

                          }
                        )

                    )}

                  </div>

                </section>

              </div>

            )}
          {/* =============================================
    REPARTIDORES
============================================= */}

{seccion ===
  "repartidores" && (

  <RepartidoresPanel />

)}

            {/* =============================================
                PRODUCTOS
            ============================================= */}

            {seccion ===
              "productos" && (

              <div className="space-y-5">

                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">

                  <div>

                    <p className="text-sm font-black text-[#2F6B4F] uppercase tracking-[0.18em]">
                      Menú
                    </p>

                    <h2 className="text-3xl font-black mt-1">
                      Productos
                    </h2>

                    <p className="text-gray-500 mt-2">
                      Precios, imágenes, categorías y stock.
                    </p>

                  </div>


                  <div className="flex flex-wrap gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        irAgregarProducto(
                          "luiggi"
                        )
                      }
                      className="bg-[#7A4E35] text-white px-4 py-3 rounded-xl font-black"
                    >
                      + Producto Luiggi
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        irAgregarProducto(
                          "santa_rosa"
                        )
                      }
                      className="bg-[#2F6B4F] text-white px-4 py-3 rounded-xl font-black"
                    >
                      + Producto Santa Rosa
                    </button>

                  </div>

                </div>


                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">

                  {productosFiltrados.map(
                    producto => (

                      <article
                        key={
                          `${producto.sucursalId}-${producto.id}`
                        }
                        className="bg-white border border-black/5 rounded-3xl shadow-sm overflow-hidden"
                      >

                        {producto.imagen && (

                          <div className="h-44 bg-gray-100">

                            <img
                              src={
                                producto.imagen
                              }
                              alt={
                                producto.Nombre ||
                                "Producto"
                              }
                              className="w-full h-full object-cover"
                            />

                          </div>

                        )}


                        <div className="p-5">

                          <p className="text-xs uppercase tracking-[0.15em] text-[#2F6B4F] font-black">
                            {producto.categoria ||
                              "Sin categoría"}
                          </p>


                          <h3 className="text-xl font-black mt-1">
                            {producto.Nombre ||
                              producto.nombre ||
                              "Producto"}
                          </h3>


                          {producto.Descripcion && (

                            <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                              {
                                producto.Descripcion
                              }
                            </p>

                          )}


                          <div className="flex justify-between gap-3 mt-4">

                            <div>

                              <p className="text-xs text-gray-500">
                                Precio
                              </p>

                              <p className="text-xl font-black text-[#7A4E35]">
                                {dinero(
                                  producto.precio ||
                                  0
                                )}
                              </p>

                            </div>


                            <div className="text-right">

                              <p className="text-xs text-gray-500">
                                Stock
                              </p>

                              <p
                                className={`
                                  text-xl
                                  font-black

                                  ${
                                    Number(
                                      producto.stock ||
                                      0
                                    ) <= 5
                                      ? "text-red-600"
                                      : "text-[#2F6B4F]"
                                  }
                                `}
                              >
                                {Number(
                                  producto.stock ||
                                  0
                                )}
                              </p>

                            </div>

                          </div>


                          <p className="text-xs text-gray-400 mt-3">
                            📍{" "}
                            {SUCURSALES[
                              producto.sucursalId
                            ]?.nombre ||
                              producto.sucursalId}
                          </p>


                          <button
                            type="button"
                            onClick={() =>
                              irEditarProducto(
                                producto
                              )
                            }
                            className="w-full mt-4 bg-[#1B120D] text-white py-3 rounded-xl font-black"
                          >
                            ✏️ Editar producto
                          </button>

                        </div>

                      </article>

                    )
                  )}


                  {productosFiltrados.length ===
                    0 && (

                    <div className="sm:col-span-2 xl:col-span-3 bg-white rounded-3xl p-10 text-center text-gray-500">
                      No hay productos en esta sucursal.
                    </div>

                  )}

                </div>

              </div>

            )}            {/* =============================================
                PROMOS
            ============================================= */}

            {seccion ===
              "promos" && (

              <div className="space-y-5">

                <div>

                  <p className="text-sm font-black text-[#2F6B4F] uppercase tracking-[0.18em]">
                    Promociones
                  </p>

                  <h2 className="text-3xl font-black mt-1">
                    Banner de promos
                  </h2>

                  <p className="text-gray-500 mt-2">
                    Armá promociones con varios productos y cantidades.
                  </p>

                </div>


                <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-4 md:p-5">

                  <label className="block text-sm font-black text-gray-600 mb-2">
                    Sucursal
                  </label>

                  <select
                    value={
                      configSucursalId
                    }
                    onChange={(e) =>
                      setConfigSucursalId(
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl p-3 bg-white"
                  >

                    <option value="luiggi">
                      Ingeniero Luiggi
                    </option>

                    <option value="santa_rosa">
                      Santa Rosa
                    </option>

                  </select>

                </div>


                <PromosPanel
                  sucursalId={
                    configSucursalId
                  }
                  productos={
                    configSucursalId ===
                    "luiggi"
                      ? productosLuiggi
                      : productosSantaRosa
                  }
                />

              </div>

            )}


            {/* =============================================
                CONFIGURACIÓN
            ============================================= */}

            {seccion ===
              "configuracion" && (

              <div className="space-y-5">

                <div>

                  <p className="text-sm font-black text-[#2F6B4F] uppercase tracking-[0.18em]">
                    Sucursal
                  </p>

                  <h2 className="text-3xl font-black mt-1">
                    Configuración
                  </h2>

                  <p className="text-gray-500 mt-2">
                    Delivery, WhatsApp, alias, dirección y estado de pedidos.
                  </p>

                </div>


                <section className="bg-white rounded-3xl border border-black/5 shadow-sm p-5">


                  <div>

                    <label className="block text-sm font-black mb-2">
                      Sucursal
                    </label>


                    <select
                      value={
                        configSucursalId
                      }
                      onChange={(e) =>
                        setConfigSucursalId(
                          e.target.value
                        )
                      }
                      className="w-full border border-gray-300 rounded-xl p-3 bg-white"
                    >

                      <option value="luiggi">
                        Ingeniero Luiggi
                      </option>

                      <option value="santa_rosa">
                        Santa Rosa
                      </option>

                    </select>

                  </div>


                  <div className="grid md:grid-cols-2 gap-4 mt-5">


                    <div>

                      <label className="block text-sm font-black mb-2">
                        🚚 Precio delivery
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={
                          configuracion
                            .precioDelivery
                        }
                        onChange={(e) =>
                          setConfiguracion(
                            (prev) => ({
                              ...prev,

                              precioDelivery:
                                e.target.value,
                            })
                          )
                        }
                        className="w-full border border-gray-300 rounded-xl p-3"
                      />

                    </div>


                    <div>

                      <label className="block text-sm font-black mb-2">
                        📱 WhatsApp
                      </label>

                      <input
                        value={
                          configuracion
                            .whatsapp ||
                          ""
                        }
                        onChange={(e) =>
                          setConfiguracion(
                            (prev) => ({
                              ...prev,

                              whatsapp:
                                e.target.value,
                            })
                          )
                        }
                        placeholder="549..."
                        className="w-full border border-gray-300 rounded-xl p-3"
                      />

                    </div>


                    <div>

                      <label className="block text-sm font-black mb-2">
                        💳 Alias
                      </label>

                      <input
                        value={
                          configuracion
                            .alias ||
                          ""
                        }
                        onChange={(e) =>
                          setConfiguracion(
                            (prev) => ({
                              ...prev,

                              alias:
                                e.target.value,
                            })
                          )
                        }
                        className="w-full border border-gray-300 rounded-xl p-3"
                      />

                    </div>


                    <div>

                      <label className="block text-sm font-black mb-2">
                        🕐 Horario
                      </label>

                      <input
                        value={
                          configuracion
                            .horario ||
                          ""
                        }
                        onChange={(e) =>
                          setConfiguracion(
                            (prev) => ({
                              ...prev,

                              horario:
                                e.target.value,
                            })
                          )
                        }
                        placeholder="19:30 a 00:00"
                        className="w-full border border-gray-300 rounded-xl p-3"
                      />

                    </div>

                  </div>


                  <div className="mt-4">

                    <label className="block text-sm font-black mb-2">
                      📍 Dirección
                    </label>

                    <input
                      value={
                        configuracion
                          .direccion ||
                        ""
                      }
                      onChange={(e) =>
                        setConfiguracion(
                          (prev) => ({
                            ...prev,

                            direccion:
                              e.target.value,
                          })
                        )
                      }
                      className="w-full border border-gray-300 rounded-xl p-3"
                    />

                  </div>


                  <div className="mt-5 bg-[#F8F5EF] rounded-2xl p-5">


                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                      <div>

                        <h3 className="font-black text-lg">
                          Pedidos online
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                          Abrí o cerrá pedidos de esta sucursal.
                        </p>

                      </div>


                      <button
                        type="button"
                        onClick={() =>
                          setConfiguracion(
                            (prev) => ({
                              ...prev,

                              abierto:
                                !prev.abierto,
                            })
                          )
                        }
                        className={`
                          px-5
                          py-3
                          rounded-full
                          font-black

                          ${
                            configuracion.abierto
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }
                        `}
                      >
                        {configuracion.abierto
                          ? "🟢 ABIERTO"
                          : "🔴 CERRADO"}
                      </button>

                    </div>


                    <div className="mt-5">

                      <label className="block text-sm font-black mb-2">
                        Mensaje cuando está cerrado
                      </label>

                      <textarea
                        rows={3}
                        value={
                          configuracion
                            .mensajeCerrado ||
                          ""
                        }
                        onChange={(e) =>
                          setConfiguracion(
                            (prev) => ({
                              ...prev,

                              mensajeCerrado:
                                e.target.value,
                            })
                          )
                        }
                        className="w-full border border-gray-300 rounded-xl p-3 bg-white"
                      />

                    </div>


                  </div>


                  <button
                    type="button"
                    onClick={
                      guardarConfiguracion
                    }
                    disabled={
                      guardandoConfiguracion
                    }
                    className="w-full mt-6 bg-[#7A4E35] disabled:bg-gray-400 text-white py-4 rounded-xl font-black"
                  >
                    {guardandoConfiguracion
                      ? "Guardando..."
                      : "💾 Guardar configuración"}
                  </button>


                </section>

              </div>

            )}


            {/* =============================================
                MOVIMIENTOS
            ============================================= */}

            {seccion ===
              "movimientos" && (

              <div className="space-y-5">


                <div>

                  <p className="text-sm font-black text-[#2F6B4F] uppercase tracking-[0.18em]">
                    Auditoría
                  </p>

                  <h2 className="text-3xl font-black mt-1">
                    Movimientos
                  </h2>

                  <p className="text-gray-500 mt-2">
                    Producción, ventas web, POS y ajustes de stock.
                  </p>

                </div>


                <section className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">


                  <div className="p-5 border-b">

                    <h3 className="text-xl font-black">
                      Historial de stock
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      Últimos movimientos registrados en Firebase.
                    </p>

                  </div>


                  <div className="overflow-x-auto">

                    <table className="w-full text-sm">

                      <thead className="bg-[#F8F5EF] text-left">

                        <tr>

                          <th className="p-4">
                            Fecha
                          </th>

                          <th className="p-4">
                            Sucursal
                          </th>

                          <th className="p-4">
                            Producto
                          </th>

                          <th className="p-4">
                            Tipo
                          </th>

                          <th className="p-4">
                            Origen
                          </th>

                          <th className="p-4">
                            Empleada
                          </th>

                          <th className="p-4 text-right">
                            Movimiento
                          </th>

                          <th className="p-4 text-right">
                            Stock
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {movimientosFiltrados
                          .slice(
                            0,
                            200
                          )
                          .map(
                            movimiento => {

                              const cantidad =
                                Number(
                                  movimiento.cantidad ??
                                  movimiento.diferencia ??
                                  0
                                );


                              return (

                                <tr
                                  key={
                                    movimiento.id
                                  }
                                  className="border-t"
                                >

                                  <td className="p-4 whitespace-nowrap">
                                    {fechaHora(
                                      movimiento.fecha
                                    )}
                                  </td>


                                  <td className="p-4">
                                    {movimiento.sucursalNombre ||
                                      SUCURSALES[
                                        movimiento.sucursalId
                                      ]?.nombre ||
                                      movimiento.sucursalId ||
                                      "-"}
                                  </td>


                                  <td className="p-4 font-bold">
                                    {movimiento.producto ||
                                      movimiento.nombreProducto ||
                                      "-"}
                                  </td>


                                  <td className="p-4">
                                    {movimiento.tipo ||
                                      "-"}
                                  </td>


                                  <td className="p-4">
                                    {movimiento.origen ||
                                      "-"}
                                  </td>


                                  <td className="p-4">
                                    {movimiento.empleada ||
                                      "-"}
                                  </td>


                                  <td
                                    className={`
                                      p-4
                                      text-right
                                      font-black

                                      ${
                                        cantidad < 0
                                          ? "text-red-600"
                                          : cantidad > 0
                                          ? "text-green-700"
                                          : "text-gray-500"
                                      }
                                    `}
                                  >
                                    {cantidad > 0
                                      ? "+"
                                      : ""}
                                    {cantidad}
                                  </td>


                                  <td className="p-4 text-right">

                                    {movimiento.stockNuevo !==
                                    undefined
                                      ? movimiento.stockNuevo
                                      : "-"}

                                  </td>

                                </tr>

                              );

                            }
                          )}


                        {movimientosFiltrados.length ===
                          0 && (

                          <tr>

                            <td
                              colSpan={8}
                              className="p-10 text-center text-gray-500"
                            >
                              No hay movimientos para mostrar.
                            </td>

                          </tr>

                        )}

                      </tbody>

                    </table>

                  </div>

                </section>


                {/* CANCELACIONES */}

                <section className="bg-white rounded-3xl border border-black/5 shadow-sm p-5">

                  <h3 className="text-xl font-black">
                    ❌ Cancelaciones
                  </h3>

                  <div className="space-y-3 mt-4">

                    {cancelacionesFiltradas.length ===
                    0 ? (

                      <p className="text-gray-500">
                        No hay cancelaciones.
                      </p>

                    ) : (

                      cancelacionesFiltradas
                        .slice(
                          0,
                          100
                        )
                        .map(
                          cancelacion => (

                            <div
                              key={
                                cancelacion.id
                              }
                              className="bg-red-50 border border-red-100 rounded-2xl p-4"
                            >

                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

                                <div>

                                  <p className="font-black">
                                    {cancelacion.cliente ||
                                      cancelacion.nombreCliente ||
                                      "Venta cancelada"}
                                  </p>

                                  <p className="text-sm text-gray-500 mt-1">
                                    {cancelacion.sucursalNombre ||
                                      SUCURSALES[
                                        cancelacion.sucursalId
                                      ]?.nombre ||
                                      cancelacion.sucursalId ||
                                      "-"}
                                  </p>

                                  <p className="text-xs text-gray-400 mt-1">
                                    {fechaHora(
                                      cancelacion.fecha
                                    )}
                                  </p>


                                  {cancelacion.motivo && (

                                    <p className="text-sm text-red-700 mt-2">
                                      Motivo:{" "}
                                      {cancelacion.motivo}
                                    </p>

                                  )}

                                </div>


                                <p className="text-lg font-black text-red-700">
                                  {dinero(
                                    cancelacion.total ||
                                    0
                                  )}
                                </p>

                              </div>

                            </div>

                          )
                        )

                    )}

                  </div>

                </section>


                {/* CIERRES */}

                <section className="bg-white rounded-3xl border border-black/5 shadow-sm p-5">

                  <h3 className="text-xl font-black">
                    🧾 Cierres de caja
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">

                    {cierresFiltrados.length ===
                    0 ? (

                      <p className="text-gray-500">
                        No hay cierres registrados.
                      </p>

                    ) : (

                      cierresFiltrados
                        .slice(
                          0,
                          100
                        )
                        .map(
                          cierre => (

                            <div
                              key={
                                cierre.id
                              }
                              className="border rounded-2xl p-4"
                            >

                              <div className="flex justify-between gap-3">

                                <div>

                                  <p className="font-black">
                                    {cierre.sucursalNombre ||
                                      SUCURSALES[
                                        cierre.sucursalId
                                      ]?.nombre ||
                                      "Sucursal"}
                                  </p>

                                  <p className="text-xs text-gray-500 mt-1">
                                    {fechaHora(
                                      cierre.fecha
                                    )}
                                  </p>

                                </div>


                                <p className="font-black text-[#2F6B4F]">
                                  {dinero(
                                    cierre.total ||
                                    cierre.totalVentas ||
                                    cierre.totalCaja ||
                                    0
                                  )}
                                </p>

                              </div>

                            </div>

                          )
                        )

                    )}

                  </div>

                </section>


              </div>

            )}


          </div>

        </main>

      </div>

    </div>

  );

}