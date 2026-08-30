"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { db } from "../../lib/firebase";

import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import Swal from "sweetalert2";


/* ======================================================
   SUCURSALES
====================================================== */

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


/* ======================================================
   VARIEDADES
====================================================== */

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


function buscarVariedad(
  productos,
  nombre
) {
  const buscado =
    normalizarTexto(nombre);

  return productos.find(
    (producto) => {
      const nombreProducto =
        normalizarTexto(
          producto.Nombre ||
          producto.nombre ||
          ""
        );

      if (
        nombre ===
        "Jamón y queso"
      ) {
        return (
          nombreProducto.includes(
            "jamon"
          ) &&
          nombreProducto.includes(
            "queso"
          )
        );
      }

      if (
        nombre ===
        "Árabe"
      ) {
        return (
          nombreProducto.includes(
            "arabe"
          ) ||
          nombreProducto.includes(
            "arab"
          )
        );
      }

      return nombreProducto.includes(
        buscado
      );
    }
  );
}


function obtenerInicioSemana() {
  const ahora =
    new Date();

  const inicio =
    new Date(ahora);

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


async function hashPin(pin) {
  const texto =
    new TextEncoder().encode(
      String(pin)
    );

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      texto
    );

  return Array.from(
    new Uint8Array(hash)
  )
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}


/* ======================================================
   COMPONENTE
====================================================== */

export default function CargarProduccionPage() {

  /* ====================================================
     LOGIN
  ==================================================== */

  const [
    sucursalLogin,
    setSucursalLogin,
  ] = useState("luiggi");


  const [
    empleadas,
    setEmpleadas,
  ] = useState([]);


  const [
    empleadaLoginId,
    setEmpleadaLoginId,
  ] = useState("");


  const [
    pin,
    setPin,
  ] = useState("");


  const [
    verificando,
    setVerificando,
  ] = useState(false);


  const [
    sesion,
    setSesion,
  ] = useState(null);


  /* ====================================================
     PRODUCCIÓN
  ==================================================== */

  const [
    productos,
    setProductos,
  ] = useState([]);


  const [
    cantidades,
    setCantidades,
  ] = useState({});


  const [
    produccionSemana,
    setProduccionSemana,
  ] = useState([]);


  const [
    cargandoProductos,
    setCargandoProductos,
  ] = useState(false);


  const [
    cargandoSemana,
    setCargandoSemana,
  ] = useState(false);


  const [
    guardando,
    setGuardando,
  ] = useState(false);


  const [
    corrigiendo,
    setCorrigiendo,
  ] = useState("");


  /* ====================================================
     LEER EMPLEADAS DE FIREBASE
  ==================================================== */

  useEffect(() => {

    const unsubscribe =
      onSnapshot(
        collection(
          db,
          "configuracionProduccion"
        ),

        (snapshot) => {

          const lista =
            snapshot.docs
              .map(
                (documento) => {

                  const data =
                    documento.data();

                  const sucursalId =
                    data.sucursalId ||
                    "luiggi";

                  return {
                    id:
                      documento.id,

                    nombre:
                      data.nombre ||
                      data.empleada ||
                      documento.id,

                    sucursalId,

                    sucursalNombre:
                      data.sucursalNombre ||
                      SUCURSALES[
                        sucursalId
                      ]?.nombre ||
                      sucursalId,

                    pinHash:
                      data.pinHash ||
                      "",

                    activa:
                      data.activa !==
                      false,

                    precioDocena:
                      Number(
                        data.precioDocena ||
                        0
                      ),
                  };
                }
              )

              .filter(
                (empleada) =>
                  empleada.activa
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

        },

        (error) => {

          console.error(
            "Error cargando empleadas:",
            error
          );


          Swal.fire({
            icon: "error",
            title:
              "No se pudieron cargar las empleadas",
          });

        }
      );


    return () =>
      unsubscribe();

  }, []);


  /* ====================================================
     EMPLEADAS DE LA SUCURSAL
  ==================================================== */

  const empleadasSucursal =
    useMemo(
      () =>
        empleadas.filter(
          (empleada) =>
            empleada.sucursalId ===
            sucursalLogin
        ),
      [
        empleadas,
        sucursalLogin,
      ]
    );


  /* ====================================================
     LOGIN
  ==================================================== */

  const ingresar =
    async () => {

      if (
        !empleadaLoginId
      ) {

        Swal.fire({
          icon: "info",
          title:
            "Elegí tu nombre",
        });

        return;
      }


      if (!pin.trim()) {

        Swal.fire({
          icon: "info",
          title:
            "Ingresá tu PIN",
        });

        return;
      }


      const empleada =
        empleadas.find(
          (item) =>
            item.id ===
              empleadaLoginId &&
            item.sucursalId ===
              sucursalLogin
        );


      if (!empleada) {

        Swal.fire({
          icon: "error",
          title:
            "Empleada no encontrada",
        });

        return;
      }


      if (!empleada.pinHash) {

        Swal.fire({
          icon: "warning",
          title:
            "Esta empleada no tiene PIN",
          text:
            "Configurale un PIN desde el Panel de Dueña.",
        });

        return;
      }


      try {

        setVerificando(
          true
        );


        const pinHash =
          await hashPin(
            pin
          );


        if (
          pinHash !==
          empleada.pinHash
        ) {

          Swal.fire({
            icon: "error",
            title:
              "PIN incorrecto",
          });

          return;
        }


        /*
         * NO guardamos sesión en sessionStorage.
         *
         * Si recarga o vuelve a abrir la página,
         * tiene que ingresar el PIN nuevamente.
         */

        setSesion({
          id:
            empleada.id,

          nombre:
            empleada.nombre,

          sucursalId:
            empleada.sucursalId,

          sucursalNombre:
            empleada.sucursalNombre,

          precioDocena:
            empleada.precioDocena,
        });


        setPin("");


        Swal.fire({
          icon: "success",

          title:
            `Hola ${empleada.nombre}`,

          timer: 900,

          showConfirmButton:
            false,
        });

      } catch (error) {

        console.error(
          "Error validando PIN:",
          error
        );


        Swal.fire({
          icon: "error",
          title:
            "No se pudo validar el PIN",
        });

      } finally {

        setVerificando(
          false
        );

      }

    };


  /* ====================================================
     CERRAR SESIÓN
  ==================================================== */

  const cerrarSesion =
    () => {

      setSesion(
        null
      );

      setCantidades(
        {}
      );

      setProductos(
        []
      );

      setProduccionSemana(
        []
      );

      setEmpleadaLoginId(
        ""
      );

      setPin("");

    };


  /* ====================================================
     LEER PRODUCTOS / STOCK
  ==================================================== */

  useEffect(() => {

    if (
      !sesion?.sucursalId
    ) {

      setProductos(
        []
      );

      return;
    }


    setCargandoProductos(
      true
    );


    const referencia =
      collection(
        db,
        "sucursales",
        sesion.sucursalId,
        "productos"
      );


    const unsubscribe =
      onSnapshot(
        referencia,

        (snapshot) => {

          const lista =
            snapshot.docs
              .map(
                (documento) => ({
                  id:
                    documento.id,

                  ...documento.data(),

                  stock:
                    Number(
                      documento
                        .data()
                        .stock ||
                      0
                    ),
                })
              )

              .filter(
                (producto) =>
                  normalizarTexto(
                    producto.categoria
                  ) ===
                  "empanadas"
              );


          setProductos(
            lista
          );


          setCargandoProductos(
            false
          );

        },

        (error) => {

          console.error(
            "Error cargando productos:",
            error
          );


          setCargandoProductos(
            false
          );


          Swal.fire({
            icon: "error",
            title:
              "No se pudieron cargar las empanadas",
          });

        }
      );


    return () =>
      unsubscribe();

  }, [
    sesion?.sucursalId,
  ]);


  /* ====================================================
     PRODUCCIÓN SEMANAL
  ==================================================== */

  useEffect(() => {

    if (
      !sesion?.id
    ) {

      setProduccionSemana(
        []
      );

      return;
    }


    setCargandoSemana(
      true
    );


    /*
     * Leemos toda la colección y filtramos acá.
     * Así evitamos necesitar índices compuestos
     * de Firestore.
     */

    const unsubscribe =
      onSnapshot(
        collection(
          db,
          "producciones"
        ),

        (snapshot) => {

          const inicioSemana =
            obtenerInicioSemana();


          const lista =
            snapshot.docs
              .map(
                (documento) => ({
                  id:
                    documento.id,

                  ...documento.data(),
                })
              )

              .filter(
                (produccion) => {

                  if (
                    produccion.empleadaId !==
                    sesion.id
                  ) {
                    return false;
                  }


                  if (
                    produccion.sucursalId !==
                    sesion.sucursalId
                  ) {
                    return false;
                  }


                  if (
                    !produccion.fecha
                  ) {
                    return false;
                  }


                  try {

                    const fecha =
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


                    return (
                      fecha >=
                      inicioSemana
                    );

                  } catch {

                    return false;

                  }

                }
              );


          setProduccionSemana(
            lista
          );


          setCargandoSemana(
            false
          );

        },

        (error) => {

          console.error(
            "Error cargando producción semanal:",
            error
          );


          setCargandoSemana(
            false
          );

        }
      );


    return () =>
      unsubscribe();

  }, [
    sesion?.id,
    sesion?.sucursalId,
  ]);


  /* ====================================================
     SUMAR / RESTAR ANTES DE GUARDAR
  ==================================================== */

  const sumarCantidad =
    (
      clave,
      cantidad
    ) => {

      setCantidades(
        (prev) => ({
          ...prev,

          [clave]:
            Number(
              prev[clave] ||
              0
            ) +
            Number(
              cantidad
            ),
        })
      );

    };


  const restarCantidadNueva =
    (
      clave,
      cantidad
    ) => {

      setCantidades(
        (prev) => ({
          ...prev,

          [clave]:
            Math.max(
              0,

              Number(
                prev[clave] ||
                0
              ) -
              Number(
                cantidad
              )
            ),
        })
      );

    };


  const cambiarCantidad =
    (
      clave,
      valor
    ) => {

      let numero =
        Number(
          valor
        );


      if (
        !Number.isFinite(
          numero
        ) ||
        numero < 0
      ) {
        numero = 0;
      }


      setCantidades(
        (prev) => ({
          ...prev,

          [clave]:
            Math.floor(
              numero
            ),
        })
      );

    };


  const limpiarCantidad =
    (clave) => {

      setCantidades(
        (prev) => ({
          ...prev,

          [clave]:
            0,
        })
      );

    };


  /* ====================================================
     PRODUCCIÓN ACTUAL
  ==================================================== */

  const produccionActual =
    useMemo(
      () =>
        VARIEDADES.map(
          (variedad) => {

            const producto =
              buscarVariedad(
                productos,
                variedad.nombre
              );


            const cantidad =
              Number(
                cantidades[
                  variedad.clave
                ] ||
                0
              );


            return {
              ...variedad,

              producto,

              cantidad,

              docenas:
                cantidad /
                12,
            };

          }
        ),
      [
        productos,
        cantidades,
      ]
    );


  const productosACargar =
    produccionActual.filter(
      (item) =>
        item.cantidad >
        0
    );


  const totalEmpanadas =
    productosACargar.reduce(
      (
        total,
        item
      ) =>
        total +
        item.cantidad,
      0
    );


  const totalDocenas =
    totalEmpanadas /
    12;


  /* ====================================================
     RESUMEN SEMANAL
  ==================================================== */

  const resumenSemana =
    useMemo(() => {

      const resumen =
        {};


      VARIEDADES.forEach(
        (variedad) => {

          resumen[
            variedad.clave
          ] = {
            ...variedad,

            cantidad:
              0,

            docenas:
              0,
          };

        }
      );


      produccionSemana.forEach(
        (produccion) => {

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
                !resumen[
                  clave
                ]
              ) {
                return;
              }


              resumen[
                clave
              ].cantidad +=
                Number(
                  datos.cantidad ||
                  0
                );


              resumen[
                clave
              ].docenas +=
                Number(
                  datos.docenas ||
                  0
                );

            }
          );

        }
      );


      return Object.values(
        resumen
      ).map(
        (item) => ({
          ...item,

          cantidad:
            Math.max(
              0,
              item.cantidad
            ),

          docenas:
            Math.max(
              0,
              item.docenas
            ),
        })
      );

    }, [
      produccionSemana,
    ]);


  const totalSemanaEmpanadas =
    resumenSemana.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.cantidad ||
          0
        ),
      0
    );


  const totalSemanaDocenas =
    totalSemanaEmpanadas /
    12;


  /* ====================================================
     GUARDAR PRODUCCIÓN
  ==================================================== */

  const guardarProduccion =
    async () => {

      if (!sesion) {
        return;
      }


      if (
        productosACargar.length ===
        0
      ) {

        Swal.fire({
          icon: "info",
          title:
            "No cargaste producción",
        });

        return;
      }


      const productoFaltante =
        productosACargar.find(
          (item) =>
            !item.producto
        );


      if (
        productoFaltante
      ) {

        Swal.fire({
          icon: "error",

          title:
            "Producto no encontrado",

          text:
            `No encontré ${productoFaltante.nombre} dentro de los productos de ${sesion.sucursalNombre}.`,
        });

        return;
      }


      const detalle =
        productosACargar
          .map(
            (item) =>
              `${item.nombre}: ${item.cantidad}`
          )
          .join(
            "<br>"
          );


      const confirmacion =
        await Swal.fire({
          icon: "question",

          title:
            "¿Guardar producción?",

          html: `
            <b>${sesion.nombre}</b><br>
            ${sesion.sucursalNombre}
            <br><br>
            ${detalle}
            <br><br>
            <b>${totalEmpanadas} empanadas</b><br>
            ${totalDocenas.toFixed(2)} docenas
          `,

          showCancelButton:
            true,

          confirmButtonText:
            "Guardar",

          cancelButtonText:
            "Cancelar",

          confirmButtonColor:
            "#2F6B4F",
        });


      if (
        !confirmacion.isConfirmed
      ) {
        return;
      }


      try {

        setGuardando(
          true
        );


        const produccionId =
          `PROD-${Date.now()}`;


        await runTransaction(
          db,

          async (
            transaction
          ) => {

            /*
             * Primero todas las lecturas.
             */

            const lecturas =
              [];


            for (
              const item
              of productosACargar
            ) {

              const productoRef =
                doc(
                  db,
                  "sucursales",
                  sesion.sucursalId,
                  "productos",
                  item.producto.id
                );


              const snapshot =
                await transaction.get(
                  productoRef
                );


              if (
                !snapshot.exists()
              ) {

                throw new Error(
                  `${item.nombre} ya no existe.`
                );

              }


              const datos =
                snapshot.data();


              const stockAnterior =
                Number(
                  datos.stock ||
                  0
                );


              const stockNuevo =
                stockAnterior +
                item.cantidad;


              lecturas.push({
                ...item,

                productoRef,

                stockAnterior,

                stockNuevo,
              });

            }


            /*
             * Después las escrituras.
             */

            const variedadesResumen =
              {};


            for (
              const item
              of lecturas
            ) {

              transaction.update(
                item.productoRef,

                {
                  stock:
                    item.stockNuevo,

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
                  produccionId,

                  tipo:
                    "produccion",

                  origen:
                    "produccion",

                  empleadaId:
                    sesion.id,

                  empleada:
                    sesion.nombre,

                  sucursalId:
                    sesion.sucursalId,

                  sucursalNombre:
                    sesion.sucursalNombre,

                  productoId:
                    item.producto.id,

                  producto:
                    item.nombre,

                  categoria:
                    "empanadas",

                  cantidad:
                    item.cantidad,

                  diferencia:
                    item.cantidad,

                  docenas:
                    item.cantidad /
                    12,

                  stockAnterior:
                    item.stockAnterior,

                  stockNuevo:
                    item.stockNuevo,

                  fecha:
                    serverTimestamp(),
                }
              );


              variedadesResumen[
                item.clave
              ] = {
                nombre:
                  item.nombre,

                productoId:
                  item.producto.id,

                cantidad:
                  item.cantidad,

                docenas:
                  item.cantidad /
                  12,

                stockAnterior:
                  item.stockAnterior,

                stockNuevo:
                  item.stockNuevo,
              };

            }


            const produccionRef =
              doc(
                db,
                "producciones",
                produccionId
              );


            transaction.set(
              produccionRef,

              {
                id:
                  produccionId,

                tipoRegistro:
                  "produccion",

                empleadaId:
                  sesion.id,

                empleada:
                  sesion.nombre,

                sucursalId:
                  sesion.sucursalId,

                sucursalNombre:
                  sesion.sucursalNombre,

                variedades:
                  variedadesResumen,

                totalEmpanadas,

                totalDocenas,

                estadoPago:
                  "pendiente",

                fecha:
                  serverTimestamp(),
              }
            );

          }
        );


        setCantidades(
          {}
        );


        Swal.fire({
          icon: "success",

          title:
            "Producción guardada",

          text:
            `${totalEmpanadas} empanadas agregadas al stock.`,

          timer:
            1500,

          showConfirmButton:
            false,
        });

      } catch (error) {

        console.error(
          "Error guardando producción:",
          error
        );


        Swal.fire({
          icon: "error",

          title:
            "No se pudo guardar",

          text:
            error?.message ||
            "Volvé a intentar.",
        });

      } finally {

        setGuardando(
          false
        );

      }

    };


  /* ====================================================
     CORREGIR PRODUCCIÓN YA GUARDADA
  ==================================================== */

  const corregirProduccion =
    async (
      variedad,
      cantidadARestar
    ) => {

      if (!sesion) {
        return;
      }


      const cantidad =
        Number(
          cantidadARestar
        );


      const producido =
        Number(
          variedad.cantidad ||
          0
        );


      if (
        producido <= 0
      ) {
        return;
      }


      if (
        cantidad >
        producido
      ) {

        Swal.fire({
          icon: "warning",

          title:
            "No podés restar esa cantidad",

          text:
            `Hay ${producido} ${variedad.nombre} registradas esta semana.`,
        });

        return;
      }


      const producto =
        buscarVariedad(
          productos,
          variedad.nombre
        );


      if (!producto) {

        Swal.fire({
          icon: "error",

          title:
            "No encontré el producto",

          text:
            variedad.nombre,
        });

        return;
      }


      const confirmacion =
        await Swal.fire({
          icon: "warning",

          title:
            `¿Restar ${cantidad}?`,

          html: `
            <b>${variedad.nombre}</b>
            <br><br>
            Tenés registradas:
            <b>${producido}</b>
            <br>
            Quedarán:
            <b>${producido - cantidad}</b>
            <br><br>
            También se corregirá el stock.
          `,

          showCancelButton:
            true,

          confirmButtonText:
            "Sí, corregir",

          cancelButtonText:
            "Cancelar",

          confirmButtonColor:
            "#b91c1c",
        });


      if (
        !confirmacion.isConfirmed
      ) {
        return;
      }


      try {

        setCorrigiendo(
          variedad.clave
        );


        const correccionId =
          `CORR-${Date.now()}`;


        await runTransaction(
          db,

          async (
            transaction
          ) => {

            const productoRef =
              doc(
                db,
                "sucursales",
                sesion.sucursalId,
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
                "El producto ya no existe."
              );

            }


            const stockAnterior =
              Number(
                snapshot
                  .data()
                  .stock ||
                0
              );


            if (
              stockAnterior <
              cantidad
            ) {

              throw new Error(
                `El stock actual es ${stockAnterior}. No se pueden descontar ${cantidad}.`
              );

            }


            const stockNuevo =
              stockAnterior -
              cantidad;


            transaction.update(
              productoRef,

              {
                stock:
                  stockNuevo,

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
                produccionId:
                  correccionId,

                tipo:
                  "correccion_produccion",

                origen:
                  "produccion",

                empleadaId:
                  sesion.id,

                empleada:
                  sesion.nombre,

                sucursalId:
                  sesion.sucursalId,

                sucursalNombre:
                  sesion.sucursalNombre,

                productoId:
                  producto.id,

                producto:
                  variedad.nombre,

                categoria:
                  "empanadas",

                cantidad:
                  -cantidad,

                diferencia:
                  -cantidad,

                docenas:
                  -(cantidad / 12),

                stockAnterior,

                stockNuevo,

                motivo:
                  "Corrección desde Producción",

                fecha:
                  serverTimestamp(),
              }
            );


            /*
             * Registro negativo para que el
             * total semanal también baje.
             */

            const produccionRef =
              doc(
                db,
                "producciones",
                correccionId
              );


            transaction.set(
              produccionRef,

              {
                id:
                  correccionId,

                tipoRegistro:
                  "correccion",

                empleadaId:
                  sesion.id,

                empleada:
                  sesion.nombre,

                sucursalId:
                  sesion.sucursalId,

                sucursalNombre:
                  sesion.sucursalNombre,

                variedades: {
                  [variedad.clave]: {
                    nombre:
                      variedad.nombre,

                    productoId:
                      producto.id,

                    cantidad:
                      -cantidad,

                    docenas:
                      -(cantidad / 12),

                    stockAnterior,

                    stockNuevo,
                  },
                },

                totalEmpanadas:
                  -cantidad,

                totalDocenas:
                  -(cantidad / 12),

                estadoPago:
                  "pendiente",

                motivo:
                  "Corrección de producción",

                fecha:
                  serverTimestamp(),
              }
            );

          }
        );


        Swal.fire({
          icon: "success",

          title:
            "Producción corregida",

          text:
            `Se restaron ${cantidad} ${variedad.nombre}.`,

          timer:
            1400,

          showConfirmButton:
            false,
        });

      } catch (error) {

        console.error(
          "Error corrigiendo producción:",
          error
        );


        Swal.fire({
          icon: "error",

          title:
            "No se pudo corregir",

          text:
            error?.message ||
            "Volvé a intentar.",
        });

      } finally {

        setCorrigiendo(
          ""
        );

      }

    };


  /* ====================================================
     LOGIN
  ==================================================== */

  if (!sesion) {

    return (

      <div className="min-h-screen bg-[#1B120D] flex items-center justify-center p-5">

        <div className="w-full max-w-md bg-[#F8F5EF] rounded-[2rem] shadow-2xl p-7">


          <div className="text-center">

            <div className="text-6xl">
              🥟
            </div>


            <p className="text-[#2F6B4F] uppercase tracking-[0.25em] text-xs font-black mt-4">
              Pizzería Jope
            </p>


            <h1 className="text-3xl font-black text-[#1B120D] mt-2">
              Producción
            </h1>


            <p className="text-gray-500 mt-2">
              Ingresá con tu PIN personal.
            </p>

          </div>


          {/* SUCURSAL */}

          <div className="mt-7">

            <label className="block font-black mb-2">
              Sucursal
            </label>


            <select
              value={
                sucursalLogin
              }

              onChange={(e) => {

                setSucursalLogin(
                  e.target.value
                );

                setEmpleadaLoginId(
                  ""
                );

                setPin("");

              }}

              className="w-full p-4 border border-gray-300 rounded-xl bg-white font-bold"
            >

              <option value="luiggi">
                Ingeniero Luiggi
              </option>


              <option value="santa_rosa">
                Santa Rosa
              </option>

            </select>

          </div>


          {/* EMPLEADA */}

          <div className="mt-4">

            <label className="block font-black mb-2">
              Empleada
            </label>


            <select
              value={
                empleadaLoginId
              }

              onChange={(e) =>
                setEmpleadaLoginId(
                  e.target.value
                )
              }

              className="w-full p-4 border border-gray-300 rounded-xl bg-white font-bold"
            >

              <option value="">
                Elegir empleada
              </option>


              {empleadasSucursal.map(
                (empleada) => (

                  <option
                    key={
                      empleada.id
                    }

                    value={
                      empleada.id
                    }
                  >
                    {empleada.nombre}
                  </option>

                )
              )}

            </select>


            {empleadasSucursal.length ===
              0 && (

              <p className="text-red-600 text-sm mt-2">
                No hay empleadas activas en esta sucursal.
              </p>

            )}

          </div>


          {/* PIN */}

          <div className="mt-4">

            <label className="block font-black mb-2">
              PIN
            </label>


            <input
              type="password"

              inputMode="numeric"

              maxLength={6}

              value={
                pin
              }

              onChange={(e) =>
                setPin(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }

              onKeyDown={(e) => {

                if (
                  e.key ===
                  "Enter"
                ) {
                  ingresar();
                }

              }}

              placeholder="••••"

              className="w-full p-4 border border-gray-300 rounded-xl bg-white text-center text-3xl tracking-[0.35em] font-black"
            />

          </div>


          <button
            type="button"

            onClick={
              ingresar
            }

            disabled={
              verificando
            }

            className="w-full mt-6 bg-[#7A4E35] disabled:bg-gray-400 text-white py-4 rounded-xl font-black text-lg"
          >

            {verificando
              ? "Ingresando..."
              : "🔐 Ingresar"}

          </button>


          <p className="text-xs text-gray-400 text-center mt-4">
            El acceso es personal para cada empleada.
          </p>


        </div>

      </div>

    );

  }


  /* ====================================================
     PANTALLA PRODUCCIÓN
  ==================================================== */

  return (

    <div className="min-h-screen bg-[#F4F5F7] text-[#1F2937] p-4 md:p-7">


      <div className="max-w-3xl mx-auto">


        {/* HEADER */}

        <div className="bg-white rounded-3xl shadow-sm p-6 mb-5">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">


            <div>

              <p className="text-[#2F6B4F] uppercase tracking-[0.2em] text-xs font-black">
                Pizzería Jope
              </p>


              <h1 className="text-3xl font-black text-[#1B120D] mt-1">
                🥟 Producción
              </h1>


              <p className="text-gray-500 mt-2">
                👩‍🍳{" "}
                <b>
                  {sesion.nombre}
                </b>
                {" · "}
                📍{" "}
                {sesion.sucursalNombre}
              </p>

            </div>


            <button
              type="button"

              onClick={
                cerrarSesion
              }

              className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-black"
            >
              🔒 Salir
            </button>


          </div>

        </div>


        {/* =================================================
            PRODUCCIÓN SEMANAL
        ================================================= */}

        <div className="bg-white rounded-3xl shadow-sm p-6 mb-5">


          <div className="flex justify-between gap-4 mb-5">


            <div>

              <p className="text-xs uppercase tracking-[0.18em] font-black text-[#2F6B4F]">
                Producción personal
              </p>


              <h2 className="text-2xl font-black mt-1">
                📅 Esta semana
              </h2>

            </div>


            <div className="text-right">

              <p className="text-3xl font-black text-[#7A4E35]">
                {totalSemanaDocenas.toFixed(
                  2
                )}
              </p>


              <p className="text-sm text-gray-500 font-bold">
                docenas
              </p>

            </div>


          </div>


          {cargandoSemana ? (

            <p className="text-center text-gray-500 py-6">
              Cargando producción...
            </p>

          ) : (

            <div className="space-y-3">


              {resumenSemana.map(
                (item) => (

                  <div
                    key={
                      item.clave
                    }

                    className="bg-[#F8F5EF] rounded-2xl p-4"
                  >


                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">


                      <div>

                        <p className="font-black">
                          {item.nombre}
                        </p>


                        <p className="text-sm text-gray-500 mt-1">
                          {item.cantidad} empanadas
                          {" · "}
                          {item.docenas.toFixed(
                            2
                          )} doc.
                        </p>

                      </div>


                      {/* CORREGIR YA GUARDADO */}

                      {item.cantidad >
                        0 && (

                        <div className="flex gap-2">


                          <button
                            type="button"

                            disabled={
                              corrigiendo ===
                              item.clave
                            }

                            onClick={() =>
                              corregirProduccion(
                                item,
                                1
                              )
                            }

                            className="bg-red-100 disabled:bg-gray-200 text-red-700 px-4 py-2 rounded-xl font-black"
                          >
                            −1
                          </button>


                          <button
                            type="button"

                            disabled={
                              corrigiendo ===
                              item.clave
                            }

                            onClick={() =>
                              corregirProduccion(
                                item,
                                Math.min(
                                  6,
                                  item.cantidad
                                )
                              )
                            }

                            className="bg-red-100 disabled:bg-gray-200 text-red-700 px-4 py-2 rounded-xl font-black"
                          >
                            −6
                          </button>


                        </div>

                      )}


                    </div>


                  </div>

                )
              )}


              <div className="pt-4 border-t flex justify-between gap-4">

                <span className="font-black">
                  TOTAL SEMANA
                </span>


                <div className="text-right">

                  <p className="text-2xl font-black text-[#7A4E35]">
                    {totalSemanaDocenas.toFixed(
                      2
                    )}{" "}
                    doc.
                  </p>


                  <p className="text-sm text-gray-500">
                    {totalSemanaEmpanadas} empanadas
                  </p>

                </div>

              </div>


            </div>

          )}


        </div>


        {/* =================================================
            NUEVA PRODUCCIÓN
        ================================================= */}

        <div className="mb-4">

          <p className="text-xs uppercase tracking-[0.18em] font-black text-[#2F6B4F]">
            Nueva carga
          </p>


          <h2 className="text-2xl font-black mt-1">
            ¿Qué hiciste hoy?
          </h2>


          <p className="text-gray-500 mt-1">
            Podés sumar o corregir antes de guardar.
          </p>

        </div>


        {cargandoProductos ? (

          <div className="bg-white rounded-3xl p-8 text-center">
            Cargando empanadas...
          </div>

        ) : (

          <div className="space-y-4">


            {produccionActual.map(
              (item) => {

                const cantidad =
                  Number(
                    item.cantidad ||
                    0
                  );


                return (

                  <div
                    key={
                      item.clave
                    }

                    className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5"
                  >


                    <div className="flex justify-between gap-4">


                      <div>

                        <h3 className="text-xl font-black text-[#7A4E35]">
                          {item.nombre}
                        </h3>


                        <p className="text-sm text-gray-500 mt-1">
                          Cantidad nueva
                        </p>

                      </div>


                      <div className="text-right">

                        <p className="text-3xl font-black text-[#2F6B4F]">
                          {cantidad}
                        </p>


                        <p className="text-xs text-gray-500">
                          {(cantidad / 12).toFixed(
                            2
                          )}{" "}
                          doc.
                        </p>

                      </div>


                    </div>


                    {/* SUMAR */}

                    <div className="grid grid-cols-4 gap-2 mt-5">


                      <button
                        type="button"

                        onClick={() =>
                          sumarCantidad(
                            item.clave,
                            6
                          )
                        }

                        className="bg-[#F4EBDD] py-3 rounded-xl font-black text-[#7A4E35]"
                      >
                        +6
                      </button>


                      <button
                        type="button"

                        onClick={() =>
                          sumarCantidad(
                            item.clave,
                            12
                          )
                        }

                        className="bg-[#F4EBDD] py-3 rounded-xl font-black text-[#7A4E35]"
                      >
                        +12
                      </button>


                      <button
                        type="button"

                        onClick={() =>
                          sumarCantidad(
                            item.clave,
                            24
                          )
                        }

                        className="bg-[#E1F1E7] py-3 rounded-xl font-black text-[#2F6B4F]"
                      >
                        +24
                      </button>


                      <button
                        type="button"

                        onClick={() =>
                          sumarCantidad(
                            item.clave,
                            48
                          )
                        }

                        className="bg-[#D3ECDD] py-3 rounded-xl font-black text-[#2F6B4F]"
                      >
                        +48
                      </button>


                    </div>


                    {/* RESTAR ANTES DE GUARDAR */}

                    {cantidad >
                      0 && (

                      <div className="grid grid-cols-2 gap-2 mt-2">


                        <button
                          type="button"

                          onClick={() =>
                            restarCantidadNueva(
                              item.clave,
                              1
                            )
                          }

                          className="bg-red-50 text-red-700 py-3 rounded-xl font-black"
                        >
                          −1
                        </button>


                        <button
                          type="button"

                          onClick={() =>
                            restarCantidadNueva(
                              item.clave,
                              6
                            )
                          }

                          className="bg-red-50 text-red-700 py-3 rounded-xl font-black"
                        >
                          −6
                        </button>


                      </div>

                    )}


                    {/* INPUT MANUAL */}

                    <input
                      type="number"

                      min="0"

                      step="1"

                      value={
                        cantidad
                      }

                      onChange={(e) =>
                        cambiarCantidad(
                          item.clave,
                          e.target.value
                        )
                      }

                      className="w-full mt-4 border border-gray-300 rounded-2xl p-4 text-center text-3xl font-black"
                    />


                    {cantidad >
                      0 && (

                      <div className="flex justify-between items-center gap-3 mt-3">


                        <span className="text-sm text-gray-500">
                          {cantidad} empanadas ={" "}
                          <b>
                            {(cantidad / 12).toFixed(
                              2
                            )}
                          </b>{" "}
                          docenas
                        </span>


                        <button
                          type="button"

                          onClick={() =>
                            limpiarCantidad(
                              item.clave
                            )
                          }

                          className="text-red-600 font-bold text-sm"
                        >
                          Limpiar
                        </button>


                      </div>

                    )}


                  </div>

                );

              }
            )}


          </div>

        )}


        {/* =================================================
            TOTAL
        ================================================= */}

        <div className="sticky bottom-3 bg-[#1B120D] text-white rounded-3xl shadow-2xl p-5 mt-6">


          <div className="flex justify-between items-center gap-4 mb-4">


            <div>

              <p className="text-white/60 text-sm">
                Producción a guardar
              </p>


              <p className="text-3xl font-black">
                {totalEmpanadas} empanadas
              </p>


              <p className="text-[#E7C873] text-xl font-black">
                {totalDocenas.toFixed(
                  2
                )}{" "}
                docenas
              </p>

            </div>


            <div className="text-5xl">
              🥟
            </div>


          </div>


          <button
            type="button"

            onClick={
              guardarProduccion
            }

            disabled={
              guardando ||
              totalEmpanadas <=
                0
            }

            className="w-full bg-[#E7C873] disabled:bg-gray-500 text-[#1B120D] disabled:text-white py-4 rounded-2xl text-lg font-black"
          >

            {guardando
              ? "Guardando..."
              : "💾 Guardar producción"}

          </button>


        </div>


      </div>

    </div>

  );

}