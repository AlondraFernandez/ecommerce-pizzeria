"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { db } from "../lib/firebase";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";


const SucursalContext =
  createContext();


const sucursalesBase = {

  luiggi: {

    id: "luiggi",

    nombre:
      "Ingeniero Luiggi",

    whatsapp:
      "5492302344813",

    precioDelivery:
      1000,

    alias:
      "pizzeria.eljope",

    direccion:
      "Ingeniero Luiggi, La Pampa",

    horario:
      "19:30 a 00:00",

    abierto:
      true,

    mensajeCerrado:
      "En este momento no estamos tomando pedidos.",


    bannerActivo:
      false,

    bannerTitulo:
      "",

    bannerTexto:
      "",

    bannerBoton:
      "Agregar promo al carrito",

    /*
     * NUEVA ESTRUCTURA
     *
     * [
     *   {
     *     productoId: "...",
     *     cantidad: 2
     *   }
     * ]
     */

    bannerProductos:
      [],

  },


  santa_rosa: {

    id:
      "santa_rosa",

    nombre:
      "Santa Rosa",

    whatsapp:
      "5492302344813",

    precioDelivery:
      1500,

    alias:
      "pizzeria.eljope",

    direccion:
      "Santa Rosa, La Pampa",

    horario:
      "19:30 a 00:00",

    abierto:
      true,

    mensajeCerrado:
      "En este momento no estamos tomando pedidos.",


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

  },

};


export const SucursalProvider = ({
  children,
}) => {

  const [
    sucursal,
    setSucursal,
  ] =
    useState(
      null
    );


  const [
    cargandoSucursal,
    setCargandoSucursal,
  ] =
    useState(
      true
    );


  /* =========================================
     NORMALIZAR CONFIGURACIÓN
  ========================================= */

  const normalizarConfiguracion =
    (
      id,
      config = {}
    ) => {

      const base =
        sucursalesBase[
          id
        ];


      if (!base) {

        return null;

      }


      /*
       * COMPATIBILIDAD CON PROMO VIEJA.
       *
       * Si todavía existe bannerProductoId,
       * lo convertimos automáticamente.
       */

      let bannerProductos =
        [];


      if (
        Array.isArray(
          config.bannerProductos
        )
      ) {

        bannerProductos =
          config.bannerProductos

            .filter(
              item =>
                item &&
                item.productoId
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
        config.bannerProductoId
      ) {

        bannerProductos = [

          {

            productoId:
              String(
                config.bannerProductoId
              ),

            cantidad:
              1,

          },

        ];

      }


      return {

        ...base,

        ...config,


        precioDelivery:
          config.precioDelivery !==
          undefined

            ? Number(
                config.precioDelivery
              )

            : base.precioDelivery,


        abierto:
          config.abierto !==
          undefined

            ? Boolean(
                config.abierto
              )

            : true,


        mensajeCerrado:
          config.mensajeCerrado ||
          base.mensajeCerrado,


        bannerActivo:
          config.bannerActivo ===
          true,


        bannerTitulo:
          config.bannerTitulo ||
          "",


        bannerTexto:
          config.bannerTexto ||
          "",


        bannerBoton:
          config.bannerBoton ||
          "Agregar promo al carrito",


        bannerProductos,

      };

    };


  /* =========================================
     CARGAR FIREBASE
  ========================================= */

  const cargarConfiguracionSucursal =
    async (
      id
    ) => {

      if (
        !sucursalesBase[
          id
        ]
      ) {

        return null;

      }


      const base =
        sucursalesBase[
          id
        ];


      try {

        const configRef =
          doc(

            db,

            "sucursales",

            id,

            "configuracion",

            "general"

          );


        const snapshot =
          await getDoc(
            configRef
          );


        /*
         * PRIMERA VEZ
         */

        if (
          !snapshot.exists()
        ) {

          await setDoc(

            configRef,

            base,

            {
              merge:
                true,
            }

          );


          return normalizarConfiguracion(
            id,
            base
          );

        }


        return normalizarConfiguracion(

          id,

          snapshot.data()

        );


      } catch (
        error
      ) {

        console.error(
          "Error cargando configuración:",
          error
        );


        return normalizarConfiguracion(
          id,
          base
        );

      }

    };


  /* =========================================
     INICIO
  ========================================= */

  useEffect(
    () => {

      const iniciar =
        async () => {

          try {

            const guardada =
              localStorage.getItem(
                "sucursal"
              );


            if (
              guardada &&
              sucursalesBase[
                guardada
              ]
            ) {

              const datos =
                await cargarConfiguracionSucursal(
                  guardada
                );


              setSucursal(
                datos
              );

            }

          } finally {

            setCargandoSucursal(
              false
            );

          }

        };


      iniciar();

    },
    []
  );


  /* =========================================
     ELEGIR SUCURSAL
  ========================================= */

  const elegirSucursal =
    async (
      id
    ) => {

      if (
        !sucursalesBase[
          id
        ]
      ) {

        return;

      }


      const anterior =
        localStorage.getItem(
          "sucursal"
        );


      /*
       * SI CAMBIA DE SUCURSAL
       * VACIAMOS CARRITO.
       */

      if (
        anterior &&
        anterior !==
        id
      ) {

        localStorage.removeItem(
          "carrito"
        );

      }


      localStorage.setItem(
        "sucursal",
        id
      );


      setCargandoSucursal(
        true
      );


      const datos =
        await cargarConfiguracionSucursal(
          id
        );


      setSucursal(
        datos
      );


      setCargandoSucursal(
        false
      );

    };


  /* =========================================
     CAMBIAR SUCURSAL
  ========================================= */

  const cambiarSucursal =
    () => {

      localStorage.removeItem(
        "sucursal"
      );


      localStorage.removeItem(
        "carrito"
      );


      setSucursal(
        null
      );

    };


  /* =========================================
     ACTUALIZAR CONFIG
  ========================================= */

  const actualizarConfiguracionSucursal =
    async (
      config
    ) => {

      if (
        !sucursal
      ) {

        throw new Error(
          "No hay una sucursal seleccionada."
        );

      }


      const configRef =
        doc(

          db,

          "sucursales",

          sucursal.id,

          "configuracion",

          "general"

        );


      const bannerProductos =
        Array.isArray(
          config.bannerProductos
        )

          ? config.bannerProductos.map(
              item => ({

                productoId:
                  String(
                    item.productoId ||
                    ""
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
            )

          : [];


      const datos = {

        precioDelivery:
          Number(
            config.precioDelivery
          ) ||
          0,


        whatsapp:
          config.whatsapp ||
          "",


        alias:
          config.alias ||
          "",


        direccion:
          config.direccion ||
          "",


        horario:
          config.horario ||
          "",


        abierto:
          config.abierto ??
          true,


        mensajeCerrado:
          config.mensajeCerrado ||
          "En este momento no estamos tomando pedidos.",


        bannerActivo:
          config.bannerActivo ===
          true,


        bannerTitulo:
          config.bannerTitulo ||
          "",


        bannerTexto:
          config.bannerTexto ||
          "",


        bannerBoton:
          config.bannerBoton ||
          "Agregar promo al carrito",


        bannerProductos,


        /*
         * COMPATIBILIDAD.
         */

        bannerProductoId:
          bannerProductos[
            0
          ]?.productoId ||
          "",

      };


      await setDoc(

        configRef,

        datos,

        {
          merge:
            true,
        }

      );


      setSucursal(
        prev => ({

          ...prev,

          ...datos,

        })
      );


      return datos;

    };


  /* =========================================
     REFRESCAR
  ========================================= */

  const refrescarSucursal =
    async () => {

      if (
        !sucursal?.id
      ) {

        return;

      }


      const datos =
        await cargarConfiguracionSucursal(
          sucursal.id
        );


      setSucursal(
        datos
      );

    };


  return (

    <SucursalContext.Provider

      value={{

        sucursal,

        elegirSucursal,

        cambiarSucursal,

        actualizarConfiguracionSucursal,

        refrescarSucursal,

        cargandoSucursal,

        sucursales:
          sucursalesBase,

      }}

    >

      {children}

    </SucursalContext.Provider>

  );

};


export const useSucursal =
  () =>
    useContext(
      SucursalContext
    );