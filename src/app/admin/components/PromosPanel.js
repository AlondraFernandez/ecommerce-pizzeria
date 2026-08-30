"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import Swal from "sweetalert2";

import {
  db,
} from "../../lib/firebase";


const CONFIG_BASE = {

  bannerActivo:
    false,

  bannerTitulo:
    "",

  bannerTexto:
    "",

  bannerBoton:
    "Agregar promo al carrito",

  bannerProductos:
    [],

};


function dinero(
  valor
) {

  return Number(
    valor ||
    0
  ).toLocaleString(
    "es-AR",
    {
      style:
        "currency",

      currency:
        "ARS",

      maximumFractionDigits:
        0,
    }
  );

}


export default function PromosPanel({

  sucursalId,

  productos,

}) {

  const [
    configuracion,
    setConfiguracion,
  ] =
    useState(
      CONFIG_BASE
    );


  const [
    productosPromo,
    setProductosPromo,
  ] =
    useState(
      []
    );


  const [
    cargando,
    setCargando,
  ] =
    useState(
      true
    );


  const [
    guardando,
    setGuardando,
  ] =
    useState(
      false
    );


  /* =========================================
     CARGAR PROMO
  ========================================= */

  useEffect(
    () => {

      if (
        !sucursalId
      ) {

        return;

      }


      setCargando(
        true
      );


      const referencia =
        doc(

          db,

          "sucursales",

          sucursalId,

          "configuracion",

          "general"

        );


      const unsubscribe =
        onSnapshot(

          referencia,

          snapshot => {

            const data =
              snapshot.exists()

                ? snapshot.data()

                : {};


            /*
             * CONVERSIÓN AUTOMÁTICA DE
             * PROMOS VIEJAS.
             */

            let bannerProductos =
              [];


            if (
              Array.isArray(
                data.bannerProductos
              )
            ) {

              bannerProductos =
                data.bannerProductos

                  .filter(
                    item =>
                      item?.productoId
                  )

                  .map(
                    item => ({

                      productoId:
                        String(
                          item.productoId
                        ),

                      cantidad:
                        Math.max(
                          0.5,
                          Number(
                            item.cantidad ||
                            1
                          )
                        ),

                    })
                  );

            }

            else if (
              data.bannerProductoId
            ) {

              bannerProductos = [

                {

                  productoId:
                    String(
                      data.bannerProductoId
                    ),

                  cantidad:
                    1,

                },

              ];

            }


            setConfiguracion({

              ...CONFIG_BASE,

              ...data,

              bannerActivo:
                data.bannerActivo ===
                true,

              bannerProductos,

            });


            setProductosPromo(
              bannerProductos
            );


            setCargando(
              false
            );

          },


          error => {

            console.error(
              "Error cargando promo:",
              error
            );


            setCargando(
              false
            );

          }

        );


      return () =>
        unsubscribe();

    },

    [
      sucursalId,
    ]

  );


  /* =========================================
     PRODUCTOS DISPONIBLES
  ========================================= */

  const productosOrdenados =
    useMemo(
      () => {

        return [

          ...productos,

        ].sort(
          (
            a,
            b
          ) =>
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

      },

      [
        productos,
      ]

    );


  /* =========================================
     BUSCAR PRODUCTO
  ========================================= */

  const buscarProducto =
    productoId => {

      return productos.find(
        producto =>
          producto.id ===
          productoId
      );

    };


  /* =========================================
     ¿YA ESTÁ?
  ========================================= */

  const productoEstaEnPromo =
    productoId => {

      return productosPromo.some(
        item =>
          item.productoId ===
          productoId
      );

    };


  /* =========================================
     AGREGAR
  ========================================= */

  const agregarProducto =
    productoId => {

      if (
        !productoId
      ) {

        return;

      }


      if (
        productoEstaEnPromo(
          productoId
        )
      ) {

        return;

      }


      setProductosPromo(
        prev => [

          ...prev,

          {

            productoId,

            cantidad:
              1,

          },

        ]
      );

    };


  /* =========================================
     QUITAR
  ========================================= */

  const quitarProducto =
    productoId => {

      setProductosPromo(
        prev =>
          prev.filter(
            item =>
              item.productoId !==
              productoId
          )
      );

    };


  /* =========================================
     CAMBIAR CANTIDAD
  ========================================= */

  const cambiarCantidad =
    (
      productoId,
      nuevaCantidad
    ) => {

      let cantidad =
        Number(
          nuevaCantidad
        );


      if (
        !Number.isFinite(
          cantidad
        )
      ) {

        cantidad = 1;

      }


      cantidad =
        Math.max(
          0.5,
          cantidad
        );


      cantidad =
        Math.round(
          cantidad *
          10
        ) /
        10;


      setProductosPromo(
        prev =>
          prev.map(
            item =>
              item.productoId ===
              productoId

                ? {

                    ...item,

                    cantidad,

                  }

                : item
          )
      );

    };


  /* =========================================
     GUARDAR
  ========================================= */

  const guardarPromo =
    async () => {

      if (
        configuracion.bannerActivo &&
        productosPromo.length ===
        0
      ) {

        const respuesta =
          await Swal.fire({

            icon:
              "warning",

            title:
              "Promo sin productos",

            text:
              "El banner está activo pero todavía no tiene productos. ¿Querés guardarlo igual?",

            showCancelButton:
              true,

            confirmButtonText:
              "Guardar igual",

            cancelButtonText:
              "Cancelar",

          });


        if (
          !respuesta.isConfirmed
        ) {

          return;

        }

      }


      setGuardando(
        true
      );


      try {

        const referencia =
          doc(

            db,

            "sucursales",

            sucursalId,

            "configuracion",

            "general"

          );


        const bannerProductos =
          productosPromo.map(
            item => ({

              productoId:
                String(
                  item.productoId
                ),

              cantidad:
                Math.max(
                  0.5,
                  Number(
                    item.cantidad ||
                    1
                  )
                ),

            })
          );


        await setDoc(

          referencia,

          {

            bannerActivo:
              configuracion.bannerActivo ===
              true,


            bannerTitulo:
              configuracion.bannerTitulo ||
              "",


            bannerTexto:
              configuracion.bannerTexto ||
              "",


            bannerBoton:
              configuracion.bannerBoton ||
              "Agregar promo al carrito",


            bannerProductos,


            /*
             * COMPATIBILIDAD CON CÓDIGO
             * ANTERIOR.
             */

            bannerProductoId:
              bannerProductos[
                0
              ]?.productoId ||
              "",


            actualizadoEn:
              serverTimestamp(),

          },

          {
            merge:
              true,
          }

        );


        await Swal.fire({

          icon:
            "success",

          title:
            configuracion.bannerActivo

              ? "✅ Promoción activada"

              : "Banner guardado",


          html: `

            <b>
              ${bannerProductos.length}
            </b>

            producto${
              bannerProductos.length ===
              1

                ? ""

                : "s"
            }

            configurado${
              bannerProductos.length ===
              1

                ? ""

                : "s"
            }.

          `,


          timer:
            1500,

          showConfirmButton:
            false,

        });


      } catch (
        error
      ) {

        console.error(
          "Error guardando promo:",
          error
        );


        Swal.fire({

          icon:
            "error",

          title:
            "No se pudo guardar",

          text:
            error?.message ||
            "Error desconocido",

        });


      } finally {

        setGuardando(
          false
        );

      }

    };


  if (
    cargando
  ) {

    return (

      <div className="bg-white rounded-3xl p-10 text-center">

        Cargando promoción...

      </div>

    );

  }


  return (

    <section className="bg-white rounded-3xl border border-black/5 shadow-sm p-4 md:p-6">


      <h2 className="text-2xl font-black text-[#7A4E35]">

        📣 Banner de promociones

      </h2>


      <p className="text-gray-500 mt-2">

        Podés armar una promo con varios
        productos y definir la cantidad de
        cada uno.

      </p>


      {/* =====================================
          ACTIVO
      ===================================== */}

      <div className="mt-6 bg-[#F8F5EF] rounded-2xl p-5 flex items-center justify-between gap-4">


        <div>

          <p className="font-black text-lg">

            Mostrar promoción

          </p>


          <p className="text-sm text-gray-500">

            Se verá arriba del menú online.

          </p>

        </div>


        <button

          type="button"

          onClick={
            () =>
              setConfiguracion(
                prev => ({

                  ...prev,

                  bannerActivo:
                    !prev.bannerActivo,

                })
              )
          }

          className={`

            px-5
            py-3
            rounded-full
            font-black

            ${
              configuracion.bannerActivo

                ? "bg-green-100 text-green-700"

                : "bg-gray-200 text-gray-600"
            }

          `}

        >

          {
            configuracion.bannerActivo

              ? "🟢 ACTIVO"

              : "⚪ INACTIVO"
          }

        </button>


      </div>


      {/* =====================================
          DATOS
      ===================================== */}

      <div className="grid md:grid-cols-2 gap-4 mt-6">


        <div>


          <label className="block text-sm font-black text-gray-600 mb-2">

            Título

          </label>


          <input

            value={
              configuracion.bannerTitulo
            }

            onChange={
              e =>
                setConfiguracion(
                  prev => ({

                    ...prev,

                    bannerTitulo:
                      e.target.value,

                  })
                )
            }

            placeholder="Promo del finde 🍕"

            className="w-full border border-gray-300 rounded-xl p-4"

          />


        </div>


        <div>


          <label className="block text-sm font-black text-gray-600 mb-2">

            Texto del botón

          </label>


          <input

            value={
              configuracion.bannerBoton
            }

            onChange={
              e =>
                setConfiguracion(
                  prev => ({

                    ...prev,

                    bannerBoton:
                      e.target.value,

                  })
                )
            }

            placeholder="Agregar promo al carrito"

            className="w-full border border-gray-300 rounded-xl p-4"

          />


        </div>


      </div>


      <div className="mt-4">


        <label className="block text-sm font-black text-gray-600 mb-2">

          Descripción

        </label>


        <textarea

          rows={
            3
          }

          value={
            configuracion.bannerTexto
          }

          onChange={
            e =>
              setConfiguracion(
                prev => ({

                  ...prev,

                  bannerTexto:
                    e.target.value,

                })
              )
          }

          placeholder="Ej.: 2 pizzas + Coca Cola"

          className="w-full border border-gray-300 rounded-xl p-4"

        />


      </div>


      {/* =====================================
          PRODUCTOS
      ===================================== */}

      <div className="mt-8">


        <div>


          <h3 className="text-xl font-black">

            🍕 Productos de la promoción

          </h3>


          <p className="text-sm text-gray-500 mt-1">

            Agregá dos, tres o todos los
            productos que quieras.

          </p>


        </div>


        <select

          defaultValue=""

          onChange={
            e => {

              agregarProducto(
                e.target.value
              );


              e.target.value =
                "";

            }
          }

          className="w-full border border-gray-300 rounded-xl p-4 mt-4"

        >


          <option value="">

            + Agregar producto

          </option>


          {
            productosOrdenados

              .filter(
                producto =>
                  !productoEstaEnPromo(
                    producto.id
                  )
              )

              .map(
                producto => (

                  <option

                    key={
                      producto.id
                    }

                    value={
                      producto.id
                    }

                  >

                    {
                      producto.Nombre
                    }

                    {" — "}

                    {
                      dinero(
                        producto.precio
                      )
                    }

                  </option>

                )
              )
          }


        </select>


        {/* PRODUCTOS SELECCIONADOS */}

        <div className="space-y-3 mt-4">


          {
            productosPromo.length ===
            0 ? (

              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-500">

                Todavía no agregaste productos.

              </div>

            ) : (

              productosPromo.map(
                item => {

                  const producto =
                    buscarProducto(
                      item.productoId
                    );


                  if (
                    !producto
                  ) {

                    return (

                      <div

                        key={
                          item.productoId
                        }

                        className="bg-red-50 border border-red-200 rounded-xl p-4"

                      >

                        <p className="text-red-700 font-bold">

                          ⚠ Producto eliminado o no encontrado

                        </p>


                        <button

                          type="button"

                          onClick={
                            () =>
                              quitarProducto(
                                item.productoId
                              )
                          }

                          className="mt-2 text-red-600 underline"

                        >

                          Quitar de la promoción

                        </button>


                      </div>

                    );

                  }


                  return (

                    <div

                      key={
                        item.productoId
                      }

                      className="bg-[#FAFAFA] border border-gray-200 rounded-2xl p-4"

                    >


                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">


                        <div className="flex items-center gap-3">


                          {
                            producto.imagen && (

                              <img

                                src={
                                  producto.imagen
                                }

                                alt={
                                  producto.Nombre
                                }

                                className="w-16 h-16 object-cover rounded-xl"

                              />

                            )
                          }


                          <div>


                            <p className="font-black text-lg">

                              {
                                producto.Nombre
                              }

                            </p>


                            <p className="text-sm text-gray-500">

                              {
                                dinero(
                                  producto.precio
                                )
                              }

                              {" · "}

                              Stock:{" "}

                              {
                                Number(
                                  producto.stock ||
                                  0
                                )
                              }

                            </p>


                          </div>


                        </div>


                        <div className="flex items-center gap-2">


                          <button

                            type="button"

                            onClick={
                              () =>
                                cambiarCantidad(

                                  item.productoId,

                                  Number(
                                    item.cantidad
                                  ) -
                                  1

                                )
                            }

                            className="w-11 h-11 rounded-xl bg-gray-200 font-black text-xl"

                          >

                            −

                          </button>


                          <input

                            type="number"

                            min="0.5"

                            step="0.5"

                            value={
                              item.cantidad
                            }

                            onChange={
                              e =>
                                cambiarCantidad(

                                  item.productoId,

                                  e.target.value

                                )
                            }

                            className="w-20 h-11 border border-gray-300 rounded-xl text-center font-black"

                          />


                          <button

                            type="button"

                            onClick={
                              () =>
                                cambiarCantidad(

                                  item.productoId,

                                  Number(
                                    item.cantidad
                                  ) +
                                  1

                                )
                            }

                            className="w-11 h-11 rounded-xl bg-[#E7C873] font-black text-xl"

                          >

                            +

                          </button>


                          <button

                            type="button"

                            onClick={
                              () =>
                                quitarProducto(
                                  item.productoId
                                )
                            }

                            className="w-11 h-11 rounded-xl bg-red-100 text-red-600 font-black"

                          >

                            ✕

                          </button>


                        </div>


                      </div>


                    </div>

                  );

                }
              )

            )
          }


        </div>


      </div>


      {/* =====================================
          PREVIEW
      ===================================== */}

      <div className="mt-8 bg-gradient-to-r from-[#7A4E35] via-[#9B5E3E] to-[#2F6B4F] text-white rounded-3xl p-6">


        <p className="text-[#E7C873] text-xs uppercase tracking-[0.25em] font-black">

          Vista previa

        </p>


        <h3 className="text-3xl font-black mt-2">

          {
            configuracion.bannerTitulo ||
            "Promoción especial"
          }

        </h3>


        {
          configuracion.bannerTexto && (

            <p className="mt-2 text-white/80">

              {
                configuracion.bannerTexto
              }

            </p>

          )
        }


        <div className="flex flex-wrap gap-2 mt-4">


          {
            productosPromo.map(
              item => {

                const producto =
                  buscarProducto(
                    item.productoId
                  );


                if (
                  !producto
                ) {

                  return null;

                }


                return (

                  <span

                    key={
                      item.productoId
                    }

                    className="bg-white/10 border border-white/20 rounded-full px-3 py-2 text-sm font-black"

                  >

                    {
                      item.cantidad
                    }

                    ×{" "}

                    {
                      producto.Nombre
                    }

                  </span>

                );

              }
            )
          }


        </div>


        <button

          type="button"

          className="mt-5 bg-[#E7C873] text-[#1B120D] px-5 py-3 rounded-xl font-black"

        >

          🛒{" "}

          {
            configuracion.bannerBoton ||
            "Agregar promo al carrito"
          }

        </button>


      </div>


      {/* =====================================
          GUARDAR
      ===================================== */}

      <button

        type="button"

        onClick={
          guardarPromo
        }

        disabled={
          guardando
        }

        className="w-full mt-6 bg-[#2F6B4F] disabled:bg-gray-400 text-white py-4 rounded-xl font-black text-lg"

      >

        {
          guardando

            ? "Guardando promoción..."

            : "📣 Guardar promoción"
        }

      </button>


    </section>

  );

}