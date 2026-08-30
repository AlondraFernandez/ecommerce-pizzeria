"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { db } from "../../../lib/firebase";

import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";

import Swal from "sweetalert2";


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
          producto.Nombre
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
        nombre === "Árabe"
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
    empleadas,
    setEmpleadas,
  ] = useState([]);


  const [
    sucursalLogin,
    setSucursalLogin,
  ] = useState(
    "luiggi"
  );


  const [
    empleadaLoginId,
    setEmpleadaLoginId,
  ] = useState("");


  const [
    pin,
    setPin,
  ] = useState("");


  const [
    sesion,
    setSesion,
  ] = useState(null);


  const [
    verificandoPin,
    setVerificandoPin,
  ] = useState(false);


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
    guardando,
    setGuardando,
  ] = useState(false);


  const [
    cargando,
    setCargando,
  ] = useState(false);


  const [
    produccionSemana,
    setProduccionSemana,
  ] = useState([]);


  const [
    cargandoSemana,
    setCargandoSemana,
  ] = useState(false);


  const [
    corrigiendo,
    setCorrigiendo,
  ] = useState(null);


  const empleada =
    sesion;


  /* ====================================================
     LEER EMPLEADAS
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
                      "",

                    activa:
                      data.activa !==
                      false,

                    pinHash:
                      data.pinHash ||
                      "",

                    precioDocena:
                      Number(
                        data.precioDocena ||
                        0
                      ),

                    ...data,
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
        }
      );

    return () =>
      unsubscribe();

  }, []);


  /* ====================================================
     RESTAURAR SESIÓN
  ==================================================== */

  useEffect(() => {

    try {
      const guardada =
        sessionStorage.getItem(
          "produccionSesion"
        );

      if (!guardada) {
        return;
      }

      const datos =
        JSON.parse(
          guardada
        );

      if (
        datos?.id &&
        datos?.sucursalId
      ) {
        setSesion(
          datos
        );
      }

    } catch {
      sessionStorage.removeItem(
        "produccionSesion"
      );
    }

  }, []);


  /* ====================================================
     EMPLEADAS POR SUCURSAL
  ==================================================== */

  const empleadasSucursal =
    useMemo(() => {

      return empleadas.filter(
        (item) =>
          item.sucursalId ===
          sucursalLogin
      );

    }, [
      empleadas,
      sucursalLogin,
    ]);


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


      if (!pin) {
        Swal.fire({
          icon: "info",
          title:
            "Ingresá tu PIN",
        });

        return;
      }


      const seleccionada =
        empleadas.find(
          (item) =>
            item.id ===
              empleadaLoginId &&
            item.sucursalId ===
              sucursalLogin
        );


      if (!seleccionada) {
        Swal.fire({
          icon: "error",
          title:
            "Empleada no encontrada",
        });

        return;
      }


      if (
        !seleccionada.pinHash
      ) {
        Swal.fire({
          icon: "warning",
          title:
            "PIN no configurado",
          text:
            "Pedile a la dueña que configure tu PIN.",
        });

        return;
      }


      setVerificandoPin(
        true
      );


      try {

        const pinIngresadoHash =
          await hashPin(
            pin
          );


        if (
          pinIngresadoHash !==
          seleccionada.pinHash
        ) {
          Swal.fire({
            icon: "error",
            title:
              "PIN incorrecto",
          });

          return;
        }


        const datosSesion = {
          id:
            seleccionada.id,

          nombre:
            seleccionada.nombre,

          sucursalId:
            seleccionada.sucursalId,

          sucursalNombre:
            seleccionada.sucursalNombre,
        };


        setSesion(
          datosSesion
        );


        sessionStorage.setItem(
          "produccionSesion",
          JSON.stringify(
            datosSesion
          )
        );


        setPin("");


        Swal.fire({
          icon: "success",
          title:
            `Hola ${seleccionada.nombre}`,
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
            "No se pudo iniciar sesión",
        });

      } finally {
        setVerificandoPin(
          false
        );
      }

    };


  /* ====================================================
     CERRAR SESIÓN
  ==================================================== */

  const cerrarSesion =
    () => {

      sessionStorage.removeItem(
        "produccionSesion"
      );

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
     LEER STOCK DE EMPANADAS
  ==================================================== */

  useEffect(() => {

    if (
      !empleada?.sucursalId
    ) {
      setProductos(
        []
      );

      return;
    }


    setCargando(
      true
    );


    const referencia =
      collection(
        db,
        "sucursales",
        empleada.sucursalId,
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
                  String(
                    producto.categoria ||
                    ""
                  ).toLowerCase() ===
                  "empanadas"
              );


          setProductos(
            lista
          );

          setCargando(
            false
          );

        },

        (error) => {
          console.error(
            error
          );

          setCargando(
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
    empleada?.sucursalId,
  ]);


  /* ====================================================
     PRODUCCIÓN SEMANAL
  ==================================================== */

  useEffect(() => {

    if (
      !empleada?.id
    ) {
      setProduccionSemana(
        []
      );

      return;
    }


    setCargandoSemana(
      true
    );


    const consulta =
      query(
        collection(
          db,
          "producciones"
        ),

        where(
          "empleadaId",
          "==",
          empleada.id
        )
      );


    const unsubscribe =
      onSnapshot(
        consulta,

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
                        inicioSemana &&
                      produccion.sucursalId ===
                        empleada.sucursalId
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
    empleada?.id,
    empleada?.sucursalId,
  ]);


  /* ====================================================
     CANTIDADES NUEVAS
  ==================================================== */

  const cambiarCantidad =
    (
      clave,
      valor
    ) => {

      let cantidad =
        Number(
          valor
        );

      if (
        !Number.isFinite(
          cantidad
        ) ||
        cantidad < 0
      ) {
        cantidad = 0;
      }

      setCantidades(
        (prev) => ({
          ...prev,

          [clave]:
            cantidad,
        })
      );

    };


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
              prev[
                clave
              ] ||
              0
            ) +
            cantidad,
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
                prev[
                  clave
                ] ||
                0
              ) -
              cantidad
            ),
        })
      );

    };


  const limpiarCantidad =
    (clave) => {

      setCantidades(
        (prev) => ({
          ...prev,
          [clave]: 0,
        })
      );

    };


  /* ====================================================
     PRODUCCIÓN A CARGAR
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
        Number(
          item.cantidad ||
          0
        ),
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
            clave:
              variedad.clave,

            nombre:
              variedad.nombre,

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


          Object.keys(
            variedades
          ).forEach(
            (clave) => {

              if (
                !resumen[
                  clave
                ]
              ) {
                return;
              }


              const datos =
                variedades[
                  clave
                ];


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

      if (!empleada) {
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
            `No encontré "${productoFaltante.nombre}" en ${empleada.sucursalNombre}.`,
        });

        return;
      }


      const detalle =
        productosACargar
          .map(
            (item) =>
              `${item.nombre}: ${item.cantidad} (${item.docenas.toFixed(
                2
              )} doc.)`
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
            <b>${empleada.nombre}</b><br>
            ${empleada.sucursalNombre}

            <br><br>

            ${detalle}

            <br><br>

            <b>Total:</b>
            ${totalEmpanadas} empanadas

            <br>

            <b>Docenas:</b>
            ${totalDocenas.toFixed(2)}
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


      setGuardando(
        true
      );


      try {

        const produccionId =
          `PROD-${Date.now()}`;


        await runTransaction(
          db,

          async (
            transaction
          ) => {

            const lecturas =
              [];


            /*
             * IMPORTANTE:
             * Primero leemos todos los productos.
             */

            for (
              const item
              of productosACargar
            ) {

              const productoRef =
                doc(
                  db,
                  "sucursales",
                  empleada.sucursalId,
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


              const cantidad =
                Number(
                  item.cantidad ||
                  0
                );


              const stockNuevo =
                stockAnterior +
                cantidad;


              lecturas.push({
                ...item,

                productoRef,

                datos,

                stockAnterior,

                stockNuevo,
              });

            }


            const variedadesResumen =
              {};


            /*
             * Después escribimos.
             */

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
                    empleada.id,

                  empleada:
                    empleada.nombre,

                  sucursalId:
                    empleada.sucursalId,

                  sucursalNombre:
                    empleada.sucursalNombre,

                  productoId:
                    lectura.producto.id,

                  producto:
                    lectura.nombre,

                  categoria:
                    "empanadas",

                  cantidad:
                    lectura.cantidad,

                  diferencia:
                    lectura.cantidad,

                  docenas:
                    lectura.cantidad /
                    12,

                  stockAnterior:
                    lectura.stockAnterior,

                  stockNuevo:
                    lectura.stockNuevo,

                  estadoPago:
                    "pendiente",

                  fecha:
                    serverTimestamp(),
                }
              );


              variedadesResumen[
                lectura.clave
              ] = {
                nombre:
                  lectura.nombre,

                productoId:
                  lectura.producto.id,

                cantidad:
                  lectura.cantidad,

                docenas:
                  lectura.cantidad /
                  12,

                stockAnterior:
                  lectura.stockAnterior,

                stockNuevo:
                  lectura.stockNuevo,
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
                  empleada.id,

                empleada:
                  empleada.nombre,

                sucursalId:
                  empleada.sucursalId,

                sucursalNombre:
                  empleada.sucursalNombre,

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


        await Swal.fire({
          icon: "success",

          title:
            "Producción guardada",

          html: `
            <b>${empleada.nombre}</b>

            <br><br>

            ${totalEmpanadas}
            empanadas

            <br>

            ${totalDocenas.toFixed(
              2
            )}
            docenas
          `,

          timer: 1500,

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
     CORREGIR PRODUCCIÓN GUARDADA
  ==================================================== */

  const corregirProduccion =
    async (
      variedad,
      cantidadARestar
    ) => {

      if (!empleada) {
        return;
      }


      const resumen =
        resumenSemana.find(
          (item) =>
            item.clave ===
            variedad.clave
        );


      const producidoSemana =
        Number(
          resumen?.cantidad ||
          0
        );


      const cantidad =
        Number(
          cantidadARestar ||
          0
        );


      if (
        cantidad <= 0
      ) {
        return;
      }


      if (
        producidoSemana <=
        0
      ) {
        Swal.fire({
          icon: "info",
          title:
            "No hay producción para corregir",
        });

        return;
      }


      if (
        cantidad >
        producidoSemana
      ) {
        Swal.fire({
          icon: "warning",

          title:
            "No podés restar esa cantidad",

          text:
            `${empleada.nombre} tiene ${producidoSemana} ${variedad.nombre} registradas esta semana.`,
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
            "Producto no encontrado",
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

            Producción semanal actual:
            <b>${producidoSemana}</b>

            <br>

            Después de corregir:
            <b>${
              producidoSemana -
              cantidad
            }</b>

            <br><br>

            También se descontarán
            <b>${cantidad}</b>
            del stock general de
            <b>${empleada.sucursalNombre}</b>.
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


      setCorrigiendo(
        variedad.clave
      );


      try {

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
                empleada.sucursalId,
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


            const datos =
              snapshot.data();


            const stockAnterior =
              Number(
                datos.stock ||
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


            /* STOCK */

            transaction.update(
              productoRef,

              {
                stock:
                  stockNuevo,

                actualizadoEn:
                  serverTimestamp(),
              }
            );


            /* MOVIMIENTO */

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
                  empleada.id,

                empleada:
                  empleada.nombre,

                sucursalId:
                  empleada.sucursalId,

                sucursalNombre:
                  empleada.sucursalNombre,

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
                  "Corrección realizada desde Producción",

                estadoPago:
                  "pendiente",

                fecha:
                  serverTimestamp(),
              }
            );


            /*
             * REGISTRO NEGATIVO.
             *
             * Esto hace que el resumen semanal
             * y lo que se paga a la empleada
             * también bajen.
             */

            const correccionRef =
              doc(
                db,
                "producciones",
                correccionId
              );


            transaction.set(
              correccionRef,

              {
                id:
                  correccionId,

                tipoRegistro:
                  "correccion",

                empleadaId:
                  empleada.id,

                empleada:
                  empleada.nombre,

                sucursalId:
                  empleada.sucursalId,

                sucursalNombre:
                  empleada.sucursalNombre,

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
            "Corrección guardada",

          text:
            `Se restaron ${cantidad} de ${variedad.nombre}.`,

          timer: 1400,

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
          null
        );

      }

    };


  /* ====================================================
     LOGIN SCREEN
  ==================================================== */

  if (!sesion) {

    return (

      <div className="min-h-screen bg-[#1B120D] flex items-center justify-center p-5">

        <div className="w-full max-w-md bg-[#F8F5EF] rounded-[2rem] p-7 shadow-2xl">


          <div className="text-center">

            <p className="text-[#2F6B4F] text-xs uppercase tracking-[0.25em] font-black">
              Pizzería Jope
            </p>


            <div className="text-6xl mt-4">
              🥟
            </div>


            <h1 className="text-3xl font-black text-[#1B120D] mt-3">
              Producción
            </h1>


            <p className="text-gray-500 mt-2">
              Ingresá con tu PIN personal.
            </p>

          </div>


          <div className="mt-7">

            <label className="font-black text-sm">
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
              className="w-full mt-2 border border-gray-300 rounded-xl p-4 bg-white font-bold"
            >

              <option value="luiggi">
                Ingeniero Luiggi
              </option>

              <option value="santa_rosa">
                Santa Rosa
              </option>

            </select>

          </div>


          <div className="mt-4">

            <label className="font-black text-sm">
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
              className="w-full mt-2 border border-gray-300 rounded-xl p-4 bg-white font-bold"
            >

              <option value="">
                Elegir empleada
              </option>


              {
                empleadasSucursal.map(
                  (empleada) => (

                    <option
                      key={
                        empleada.id
                      }
                      value={
                        empleada.id
                      }
                    >
                      {
                        empleada.nombre
                      }
                    </option>

                  )
                )
              }

            </select>


            {
              empleadasSucursal.length ===
              0 && (

                <p className="text-sm text-red-600 mt-2">
                  No hay empleadas activas en esta sucursal.
                </p>

              )
            }

          </div>


          <div className="mt-4">

            <label className="font-black text-sm">
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
              className="w-full mt-2 border border-gray-300 rounded-xl p-4 text-center text-3xl tracking-[0.4em] font-black"
            />

          </div>


          <button
            type="button"
            onClick={
              ingresar
            }
            disabled={
              verificandoPin
            }
            className="w-full mt-6 bg-[#7A4E35] disabled:bg-gray-400 text-white py-4 rounded-xl font-black text-lg"
          >
            {
              verificandoPin
                ? "Ingresando..."
                : "🔐 Ingresar"
            }
          </button>

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

        <div className="bg-white rounded-3xl shadow-md p-6 mb-5">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            <div>

              <p className="text-[#2F6B4F] text-xs uppercase tracking-[0.25em] font-black">
                Pizzería Jope
              </p>


              <h1 className="text-3xl font-black mt-2 text-[#1B120D]">
                🥟 Producción
              </h1>


              <p className="text-gray-500 mt-2">
                👩‍🍳{" "}
                <b>
                  {
                    empleada.nombre
                  }
                </b>

                {" · "}

                📍{" "}
                {
                  empleada.sucursalNombre
                }
              </p>

            </div>


            <button
              type="button"
              onClick={
                cerrarSesion
              }
              className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-black"
            >
              Cerrar sesión
            </button>

          </div>

        </div>


        {/* RESUMEN SEMANAL */}

        <div className="bg-white rounded-3xl shadow-md p-6 mb-5">

          <div className="flex justify-between items-start gap-4 mb-5">

            <div>

              <p className="text-[#2F6B4F] text-xs uppercase tracking-[0.2em] font-black">
                Producción personal
              </p>

              <h2 className="text-2xl font-black text-[#1B120D] mt-1">
                📅 Esta semana
              </h2>

            </div>


            <div className="text-right">

              <p className="text-3xl font-black text-[#7A4E35]">
                {
                  totalSemanaDocenas.toFixed(
                    2
                  )
                }
              </p>

              <p className="text-sm text-gray-500 font-bold">
                docenas
              </p>

            </div>

          </div>


          {
            cargandoSemana ? (

              <p className="text-center text-gray-500 py-5">
                Cargando producción...
              </p>

            ) : (

              <div className="space-y-3">


                {
                  resumenSemana.map(
                    (item) => (

                      <div
                        key={
                          item.clave
                        }
                        className="bg-[#F8F5EF] rounded-2xl p-4"
                      >

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                          <div>

                            <p className="font-black text-gray-700">
                              {
                                item.nombre
                              }
                            </p>

                            <p className="text-xs text-gray-500 mt-1">
                              {
                                item.cantidad
                              }
                              {" "}
                              empanadas

                              {" · "}

                              {
                                item.docenas.toFixed(
                                  2
                                )
                              }
                              {" "}
                              doc.
                            </p>

                          </div>


                          {
                            item.cantidad >
                            0 && (

                              <div className="flex gap-2">

                                <button
                                  type="button"
                                  onClick={() =>
                                    corregirProduccion(
                                      item,
                                      1
                                    )
                                  }
                                  disabled={
                                    corrigiendo ===
                                    item.clave
                                  }
                                  className="bg-red-100 disabled:bg-gray-200 text-red-700 px-3 py-2 rounded-xl font-black"
                                >
                                  −1
                                </button>


                                <button
                                  type="button"
                                  onClick={() =>
                                    corregirProduccion(
                                      item,
                                      Math.min(
                                        6,
                                        item.cantidad
                                      )
                                    )
                                  }
                                  disabled={
                                    corrigiendo ===
                                    item.clave
                                  }
                                  className="bg-red-100 disabled:bg-gray-200 text-red-700 px-3 py-2 rounded-xl font-black"
                                >
                                  −6
                                </button>

                              </div>

                            )
                          }

                        </div>

                      </div>

                    )
                  )
                }


                <div className="pt-4 border-t flex justify-between gap-4">

                  <span className="font-black">
                    TOTAL SEMANA
                  </span>


                  <div className="text-right">

                    <p className="text-2xl font-black text-[#7A4E35]">
                      {
                        totalSemanaDocenas.toFixed(
                          2
                        )
                      }
                      {" "}
                      doc.
                    </p>

                    <p className="text-sm text-gray-500">
                      {
                        totalSemanaEmpanadas
                      }
                      {" "}
                      empanadas
                    </p>

                  </div>

                </div>

              </div>

            )
          }

        </div>


        {/* CARGA NUEVA */}

        {
          cargando ? (

            <div className="bg-white rounded-3xl p-8 text-center">
              Cargando empanadas...
            </div>

          ) : (

            <>

              <div className="space-y-4">


                {
                  produccionActual.map(
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
                          className="bg-white rounded-3xl shadow-sm border border-gray-200 p-5"
                        >

                          <div className="flex justify-between gap-4">

                            <div>

                              <h2 className="text-xl md:text-2xl font-black text-[#7A4E35]">
                                {
                                  item.nombre
                                }
                              </h2>

                              <p className="text-sm text-gray-500 mt-1">
                                Nueva producción a cargar
                              </p>

                            </div>


                            {
                              cantidad >
                              0 && (

                                <div className="text-right">

                                  <p className="text-3xl font-black text-[#2F6B4F]">
                                    {
                                      cantidad
                                    }
                                  </p>

                                  <p className="text-sm font-bold text-gray-500">
                                    {
                                      (
                                        cantidad /
                                        12
                                      ).toFixed(
                                        2
                                      )
                                    }
                                    {" "}
                                    doc.
                                  </p>

                                </div>

                              )
                            }

                          </div>


                          {/* SUMAR */}

                          <div className="grid grid-cols-4 gap-2 mt-5">

                            <button
                              type="button"
                              onClick={() =>
                                sumarCantidad(
                                  item.clave,
                                  1
                                )
                              }
                              className="bg-[#F4EBDD] py-3 rounded-xl font-black text-[#7A4E35]"
                            >
                              +1
                            </button>


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
                              className="bg-[#E1F1E7] py-3 rounded-xl font-black text-[#2F6B4F]"
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
                              className="bg-[#D3ECDD] py-3 rounded-xl font-black text-[#2F6B4F]"
                            >
                              +24
                            </button>

                          </div>


                          {/* RESTAR ANTES DE GUARDAR */}

                          {
                            cantidad >
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
                                  className="bg-red-50 text-red-700 py-2.5 rounded-xl font-black"
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
                                  className="bg-red-50 text-red-700 py-2.5 rounded-xl font-black"
                                >
                                  −6
                                </button>

                              </div>

                            )
                          }


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
                            className="w-full mt-4 border border-gray-300 rounded-2xl p-4 text-center text-3xl font-black bg-white"
                          />


                          {
                            cantidad >
                            0 && (

                              <div className="mt-3 flex justify-between items-center gap-3">

                                <span className="text-sm text-gray-500">
                                  {
                                    cantidad
                                  }
                                  {" "}
                                  empanadas ={" "}

                                  <b>
                                    {
                                      (
                                        cantidad /
                                        12
                                      ).toFixed(
                                        2
                                      )
                                    }
                                  </b>
                                  {" "}
                                  docenas
                                </span>


                                <button
                                  type="button"
                                  onClick={() =>
                                    limpiarCantidad(
                                      item.clave
                                    )
                                  }
                                  className="text-red-600 text-sm font-bold"
                                >
                                  Limpiar
                                </button>

                              </div>

                            )
                          }

                        </div>

                      );

                    }
                  )
                }

              </div>


              {/* TOTAL / GUARDAR */}

              <div className="sticky bottom-3 bg-[#1B120D] text-white rounded-3xl shadow-2xl p-5 mt-6">

                <div className="flex justify-between items-center gap-4 mb-4">

                  <div>

                    <p className="text-white/60 text-sm">
                      Producción a guardar
                    </p>


                    <p className="text-3xl font-black">
                      {
                        totalEmpanadas
                      }
                      {" "}
                      empanadas
                    </p>


                    <p className="text-[#E7C873] text-xl font-black">
                      {
                        totalDocenas.toFixed(
                          2
                        )
                      }
                      {" "}
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
                  {
                    guardando
                      ? "Guardando..."
                      : "Guardar producción"
                  }
                </button>

              </div>

            </>

          )
        }

      </div>

    </div>

  );

}