"use client";

import {
  useEffect,
  useState,
} from "react";

import { db } from "../lib/firebase";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import {
  useCart,
} from "../context/CartContext";

import {
  useSucursal,
} from "../context/SucursalContext";

import Image from "next/image";

import Swal from "sweetalert2";

import {
  motion,
} from "framer-motion";

import {
  useRouter,
} from "next/navigation";


const categoriasOrdenadas = [

  "pizzas",

  "empanadas",

  "hamburguesas",

  "bebidas",

  "promos",

];


const nombres = {

  pizzas:
    "🍕 Pizzas",

  empanadas:
    "🥟 Empanadas",

  hamburguesas:
    "🍔 Hamburguesas",

  bebidas:
    "🥤 Bebidas",

  promos:
    "🎁 Promos",

};


const ProductosPage =
  () => {

    const router =
      useRouter();


    const {
      agregarAlCarrito,
    } =
      useCart();


    const {

      sucursal,

      elegirSucursal,

      cambiarSucursal,

      refrescarSucursal,

    } =
      useSucursal();


    const [
      productos,
      setProductos,
    ] =
      useState(
        []
      );


    const [
      busqueda,
      setBusqueda,
    ] =
      useState(
        ""
      );


    const [
      categoriaSeleccionada,
      setCategoriaSeleccionada,
    ] =
      useState(
        ""
      );


    const [
      contadorActivo,
      setContadorActivo,
    ] =
      useState(
        null
      );


    const [
      cantidadSeleccionada,
      setCantidadSeleccionada,
    ] =
      useState(
        {}
      );


    /* =========================================
       PRODUCTOS FIREBASE
    ========================================= */

    useEffect(
      () => {

        if (
          !sucursal?.id
        ) {

          setProductos(
            []
          );

          return;

        }


        /*
         * ACTUALIZA CONFIGURACIÓN
         * INCLUYENDO BANNER.
         */

        refrescarSucursal();


        const productosRef =
          collection(

            db,

            "sucursales",

            sucursal.id,

            "productos"

          );


        const unsubscribe =
          onSnapshot(

            productosRef,

            snapshot => {

              setProductos(

                snapshot.docs.map(
                  documento => ({

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

                    precio:
                      Number(
                        documento
                          .data()
                          .precio ||
                        0
                      ),

                  })
                )

              );

            },


            error => {

              console.error(
                "Error escuchando productos:",
                error
              );


              Swal.fire({

                icon:
                  "error",

                title:
                  "No se pudo cargar el menú",

                text:
                  "Revisá tu conexión a Internet.",

              });

            }

          );


        return () =>
          unsubscribe();

      },

      [
        sucursal?.id,
      ]

    );


    /* =========================================
       ELEGIR SUCURSAL
    ========================================= */

    if (
      !sucursal
    ) {

      return (

        <div className="min-h-screen bg-[#1B120D] flex items-center justify-center p-6">


          <div className="bg-[#F8F5EF] p-8 rounded-3xl w-full max-w-md text-center">


            <h1 className="text-3xl font-black mb-6">

              Elegí tu sucursal

            </h1>


            <button

              onClick={
                () =>
                  elegirSucursal(
                    "luiggi"
                  )
              }

              className="w-full bg-[#7A4E35] text-white p-4 rounded-xl font-black mb-3"

            >

              Ingeniero Luiggi

            </button>


            <button

              onClick={
                () =>
                  elegirSucursal(
                    "santa_rosa"
                  )
              }

              className="w-full bg-[#2F6B4F] text-white p-4 rounded-xl font-black"

            >

              Santa Rosa

            </button>


          </div>


        </div>

      );

    }


    /* =========================================
       FILTRAR
    ========================================= */

    const filtrados =
      productos.filter(
        producto => {

          const categoria =
            producto.categoria
              ?.toLowerCase() ||
            "";


          const texto =
            busqueda
              .trim()
              .toLowerCase();


          const coincideCategoria =

            !categoriaSeleccionada ||

            categoria ===
              categoriaSeleccionada;


          const coincideTexto =

            !texto ||

            producto.Nombre
              ?.toLowerCase()
              .includes(
                texto
              ) ||

            producto.Descripcion
              ?.toLowerCase()
              .includes(
                texto
              ) ||

            categoria.includes(
              texto
            );


          return (

            coincideCategoria &&

            coincideTexto

          );

        }
      );


    const categoriasMostrar =

      categoriaSeleccionada

        ? [
            categoriaSeleccionada
          ]

        : categoriasOrdenadas;


    /* =========================================
       CANTIDADES
    ========================================= */

    const minimoProducto =
      producto => {

        const categoria =
          producto.categoria
            ?.toLowerCase();


        if (
          categoria ===
          "pizzas"
        ) {

          return 0.5;

        }


        if (
          categoria ===
          "empanadas"
        ) {

          return 3;

        }


        return 1;

      };


    const abrirContador =
      producto => {

        setContadorActivo(
          producto.id
        );


        setCantidadSeleccionada(
          prev => ({

            ...prev,

            [
              producto.id
            ]:
              minimoProducto(
                producto
              ),

          })
        );

      };


    const cambiarCantidad =
      (
        producto,
        sumar
      ) => {

        const categoria =
          producto.categoria
            ?.toLowerCase();


        const minimo =
          minimoProducto(
            producto
          );


        const actual =

          cantidadSeleccionada[
            producto.id
          ] ??

          minimo;


        const paso =

          categoria ===
          "pizzas"

            ? 0.5

            : 1;


        let nueva =

          sumar

            ? actual +
              paso

            : actual -
              paso;


        nueva =
          Math.max(
            nueva,
            minimo
          );


        nueva =
          Math.min(
            nueva,
            producto.stock
          );


        setCantidadSeleccionada(
          prev => ({

            ...prev,

            [
              producto.id
            ]:

              Math.round(
                nueva *
                10
              ) /
              10,

          })
        );

      };


    /* =========================================
       AGREGAR PRODUCTO NORMAL
    ========================================= */

    const confirmarAgregar =
      producto => {

        const cantidad =

          cantidadSeleccionada[
            producto.id
          ] ??

          minimoProducto(
            producto
          );


        if (
          Number(
            producto.stock ||
            0
          ) <
          Number(
            cantidad
          )
        ) {

          Swal.fire({

            icon:
              "error",

            title:
              "Stock insuficiente",

          });


          return;

        }


        agregarAlCarrito({

          ...producto,

          cantidad,

          sucursalId:
            sucursal.id,

          sucursalNombre:
            sucursal.nombre,

        });


        setContadorActivo(
          null
        );


        Swal.fire({

          icon:
            "success",

          title:
            "Agregado al carrito",

          timer:
            1000,

          showConfirmButton:
            false,

        });

      };


    /* =========================================
       PRODUCTOS DE LA PROMO
    ========================================= */

    const obtenerProductosBanner =
      () => {

        /*
         * NUEVA ESTRUCTURA.
         */

        if (
          Array.isArray(
            sucursal.bannerProductos
          ) &&
          sucursal.bannerProductos
            .length >
            0
        ) {

          return sucursal.bannerProductos;

        }


        /*
         * COMPATIBILIDAD CON PROMO ANTIGUA.
         */

        if (
          sucursal.bannerProductoId
        ) {

          return [

            {

              productoId:
                sucursal.bannerProductoId,

              cantidad:
                1,

            },

          ];

        }


        return [];

      };


    /* =========================================
       AGREGAR PROMO COMPLETA
    ========================================= */

    const agregarPromoBanner =
      async () => {

        const productosBanner =
          obtenerProductosBanner();


        if (
          productosBanner.length ===
          0
        ) {

          Swal.fire({

            icon:
              "error",

            title:
              "Promo no configurada",

            text:
              "Esta promoción todavía no tiene productos asociados.",

          });


          return;

        }


        /*
         * PREPARAMOS TODOS LOS PRODUCTOS
         * ANTES DE AGREGAR NINGUNO.
         */

        const preparados =
          [];


        for (
          const item
          of productosBanner
        ) {

          const producto =
            productos.find(
              producto =>
                producto.id ===
                item.productoId
            );


          if (!producto) {

            Swal.fire({

              icon:
                "error",

              title:
                "Producto no encontrado",

              text:
                "Uno de los productos de la promoción ya no existe.",

            });


            return;

          }


          const cantidad =
            Math.max(

              0.5,

              Number(
                item.cantidad ||
                1
              )

            );


          const stock =
            Number(
              producto.stock ||
              0
            );


          if (
            stock <
            cantidad
          ) {

            Swal.fire({

              icon:
                "warning",

              title:
                "Promo sin stock",

              html: `

                No alcanza el stock de:

                <br><br>

                <b>
                  ${producto.Nombre}
                </b>

                <br>

                Necesitamos:
                <b>
                  ${cantidad}
                </b>

                <br>

                Disponible:
                <b>
                  ${stock}
                </b>

              `,

            });


            return;

          }


          preparados.push({

            producto,

            cantidad,

          });

        }


        /*
         * SI TODO TIENE STOCK,
         * AGREGAMOS TODO.
         */

        preparados.forEach(
          ({
            producto,
            cantidad,
          }) => {

            agregarAlCarrito({

              ...producto,

              cantidad,

              sucursalId:
                sucursal.id,

              sucursalNombre:
                sucursal.nombre,

            });

          }
        );


        await Swal.fire({

          icon:
            "success",

          title:
            "¡Promo agregada!",

          text:
            `${preparados.length} producto${
              preparados.length ===
              1
                ? ""
                : "s"
            } agregados al carrito.`,

          timer:
            1100,

          showConfirmButton:
            false,

        });


        router.push(
          "/carrito"
        );

      };


    /* =========================================
       TEXTO RESUMEN BANNER
    ========================================= */

    const productosPromoResumen =
      obtenerProductosBanner()

        .map(
          item => {

            const producto =
              productos.find(
                producto =>
                  producto.id ===
                  item.productoId
              );


            if (!producto) {

              return null;

            }


            return {

              id:
                item.productoId,

              nombre:
                producto.Nombre,

              cantidad:
                Number(
                  item.cantidad ||
                  1
                ),

            };

          }
        )

        .filter(
          Boolean
        );


    /* =========================================
       PANTALLA
    ========================================= */

    return (

      <div className="min-h-screen bg-[#1B120D] text-white">


        {/* =====================================
            BANNER
        ===================================== */}

        {
          sucursal.bannerActivo ===
          true && (

            <motion.div

              initial={{
                opacity:
                  0,

                y:
                  -15,
              }}

              animate={{
                opacity:
                  1,

                y:
                  0,
              }}

              className="relative overflow-hidden bg-gradient-to-r from-[#7A4E35] via-[#9B5E3E] to-[#2F6B4F]"

            >


              <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#E7C873]/20 rounded-full blur-3xl" />


              <div className="relative max-w-7xl mx-auto px-6 py-9 md:py-11 flex flex-col md:flex-row gap-7 md:items-center md:justify-between">


                <div>


                  <p className="text-[#E7C873] uppercase font-black text-xs tracking-[0.3em]">

                    Promo especial ·{" "}

                    {
                      sucursal.nombre
                    }

                  </p>


                  <h2 className="text-3xl md:text-5xl font-black mt-2">

                    {
                      sucursal.bannerTitulo ||
                      "Promoción especial"
                    }

                  </h2>


                  {
                    sucursal.bannerTexto && (

                      <p className="mt-3 text-lg text-white/90 max-w-2xl">

                        {
                          sucursal.bannerTexto
                        }

                      </p>

                    )
                  }


                  {/* PRODUCTOS INCLUIDOS */}

                  {
                    productosPromoResumen
                      .length >
                      0 && (

                      <div className="flex flex-wrap gap-2 mt-5">

                        {
                          productosPromoResumen.map(
                            item => (

                              <span

                                key={
                                  item.id
                                }

                                className="bg-white/10 border border-white/15 px-3 py-2 rounded-full text-sm font-black"

                              >

                                {
                                  item.cantidad
                                }
                                ×{" "}
                                {
                                  item.nombre
                                }

                              </span>

                            )
                          )
                        }

                      </div>

                    )
                  }


                </div>


                <button

                  onClick={
                    agregarPromoBanner
                  }

                  className="bg-[#E7C873] hover:bg-[#F1D98D] text-[#1B120D] px-7 py-4 rounded-full font-black text-center shadow-xl whitespace-nowrap"

                >

                  🛒{" "}

                  {
                    sucursal.bannerBoton ||
                    "Agregar promo al carrito"
                  }

                </button>


              </div>


            </motion.div>

          )
        }


        {/* =====================================
            MENÚ
        ===================================== */}

        <main

          id="menu"

          className="max-w-7xl mx-auto p-5 md:p-8"

        >


          <div className="text-center mb-10">


            <p className="text-[#E7C873] uppercase text-xs font-black tracking-[0.3em]">

              Menú online

            </p>


            <h1 className="text-4xl md:text-6xl font-black mt-3">

              Elegí tus favoritos

            </h1>


            <p className="mt-3 text-white/70">

              Sucursal{" "}

              <strong className="text-[#E7C873]">

                {
                  sucursal.nombre
                }

              </strong>

            </p>


            <button

              onClick={
                cambiarSucursal
              }

              className="mt-3 text-[#E7C873] underline"

            >

              Cambiar sucursal

            </button>


          </div>


          <input

            value={
              busqueda
            }

            onChange={
              e =>
                setBusqueda(
                  e.target.value
                )
            }

            placeholder="Buscar..."

            className="block w-full max-w-md mx-auto bg-[#F8F5EF] text-[#2B2B2B] p-4 rounded-2xl mb-5"

          />


          <select

            value={
              categoriaSeleccionada
            }

            onChange={
              e =>
                setCategoriaSeleccionada(
                  e.target.value
                )
            }

            className="block w-full max-w-sm mx-auto bg-[#F8F5EF] text-[#2B2B2B] p-4 rounded-2xl mb-12"

          >


            <option value="">

              Todas las categorías

            </option>


            {
              categoriasOrdenadas.map(
                categoria => (

                  <option

                    key={
                      categoria
                    }

                    value={
                      categoria
                    }

                  >

                    {
                      nombres[
                        categoria
                      ]
                    }

                  </option>

                )
              )
            }


          </select>


          {
            filtrados.length ===
            0 ? (

              <div className="bg-[#F8F5EF] text-[#2B2B2B] p-8 rounded-3xl text-center">

                No encontramos productos.

              </div>

            ) : (

              categoriasMostrar.map(
                categoria => {

                  const lista =
                    filtrados.filter(
                      producto =>
                        producto.categoria
                          ?.toLowerCase() ===
                        categoria
                    );


                  if (
                    !lista.length
                  ) {

                    return null;

                  }


                  return (

                    <section

                      key={
                        categoria
                      }

                      className="mb-14"

                    >


                      <h2 className="text-3xl font-black text-[#E7C873] mb-6">

                        {
                          nombres[
                            categoria
                          ]
                        }

                      </h2>


                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">


                        {
                          lista.map(
                            producto => (

                              <div

                                key={
                                  producto.id
                                }

                                className="bg-[#F8F5EF] text-[#2B2B2B] p-5 rounded-3xl"

                              >


                                <div className="relative h-52 overflow-hidden rounded-2xl">


                                  <Image

                                    src={
                                      producto.imagen ||
                                      "/logo.png"
                                    }

                                    alt={
                                      producto.Nombre ||
                                      "Producto"
                                    }

                                    fill

                                    style={{
                                      objectFit:
                                        "cover",
                                    }}

                                  />


                                </div>


                                <h3 className="text-2xl font-black mt-5 text-center">

                                  {
                                    producto.Nombre
                                  }

                                </h3>


                                <p className="text-center mt-2 text-gray-600">

                                  {
                                    producto.Descripcion
                                  }

                                </p>


                                <p className="text-3xl text-[#7A4E35] font-black text-center mt-4">

                                  $
                                  {
                                    Number(
                                      producto.precio ||
                                      0
                                    ).toLocaleString(
                                      "es-AR"
                                    )
                                  }

                                </p>


                                <p className="text-center mt-2 text-sm text-gray-500">

                                  Stock disponible:{" "}

                                  {
                                    Number(
                                      producto.stock ||
                                      0
                                    )
                                  }

                                </p>


                                {
                                  contadorActivo ===
                                  producto.id ? (

                                    <div className="mt-5 bg-white rounded-2xl p-4">


                                      <div className="flex justify-center items-center gap-5">


                                        <button

                                          onClick={
                                            () =>
                                              cambiarCantidad(
                                                producto,
                                                false
                                              )
                                          }

                                          className="bg-[#7A4E35] text-white w-10 h-10 rounded-full"

                                        >

                                          -

                                        </button>


                                        <strong className="text-2xl">

                                          {
                                            cantidadSeleccionada[
                                              producto.id
                                            ]
                                          }

                                        </strong>


                                        <button

                                          onClick={
                                            () =>
                                              cambiarCantidad(
                                                producto,
                                                true
                                              )
                                          }

                                          className="bg-[#2F6B4F] text-white w-10 h-10 rounded-full"

                                        >

                                          +

                                        </button>


                                      </div>


                                      <button

                                        onClick={
                                          () =>
                                            confirmarAgregar(
                                              producto
                                            )
                                        }

                                        className="w-full mt-4 bg-[#7A4E35] text-white py-3 rounded-xl font-black"

                                      >

                                        Confirmar

                                      </button>


                                    </div>

                                  ) : (

                                    <button

                                      disabled={
                                        Number(
                                          producto.stock ||
                                          0
                                        ) <
                                        minimoProducto(
                                          producto
                                        )
                                      }

                                      onClick={
                                        () =>
                                          abrirContador(
                                            producto
                                          )
                                      }

                                      className="w-full mt-5 bg-[#7A4E35] disabled:bg-gray-400 text-white py-3 rounded-xl font-black"

                                    >

                                      {
                                        Number(
                                          producto.stock ||
                                          0
                                        ) <
                                        minimoProducto(
                                          producto
                                        )

                                          ? "Sin stock"

                                          : "Agregar al carrito"
                                      }

                                    </button>

                                  )
                                }


                              </div>

                            )
                          )
                        }


                      </div>


                    </section>

                  );

                }
              )

            )
          }


        </main>


      </div>

    );

  };


export default ProductosPage;