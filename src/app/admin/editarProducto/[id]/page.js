"use client";

import { useEffect, useState } from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { db, storage } from "../../../lib/firebase";

import { useAuth } from "../../../context/AuthContext";
import { useSucursal } from "../../../context/SucursalContext";


const ADMIN_EMAIL =
  "alondra2017gaitan@gmail.com";


const EditarProductoPage = () => {

  const router =
    useRouter();

  const params =
    useParams();

  const id =
    params?.id;


  const { user } =
    useAuth();

  const { sucursal } =
    useSucursal();


  /* =========================================
     ESTADOS
  ========================================= */

  const [
    cargando,
    setCargando,
  ] = useState(true);


  const [
    guardando,
    setGuardando,
  ] = useState(false);


  const [
    productoExiste,
    setProductoExiste,
  ] = useState(true);


  const [
    nombre,
    setNombre,
  ] = useState("");


  const [
    descripcion,
    setDescripcion,
  ] = useState("");


  const [
    precio,
    setPrecio,
  ] = useState("");


  const [
    stock,
    setStock,
  ] = useState("");


  const [
    categoria,
    setCategoria,
  ] = useState("");


  const [
    imagen,
    setImagen,
  ] = useState("");


  const [
    imagenArchivo,
    setImagenArchivo,
  ] = useState(null);


  /* =========================================
     SEGURIDAD
  ========================================= */

  useEffect(() => {

    if (!user) {
      return;
    }


    if (
      user.email?.toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
      router.replace("/");
    }

  }, [
    user,
    router,
  ]);


  /* =========================================
     CARGAR PRODUCTO
  ========================================= */

  useEffect(() => {

    const obtenerProducto =
      async () => {

        if (
          !id ||
          !sucursal?.id
        ) {
          return;
        }


        try {

          setCargando(true);

          setProductoExiste(true);


          const productoRef =
            doc(
              db,
              "sucursales",
              sucursal.id,
              "productos",
              String(id)
            );


          const productoSnapshot =
            await getDoc(
              productoRef
            );


          if (
            !productoSnapshot.exists()
          ) {

            setProductoExiste(false);

            return;
          }


          const data =
            productoSnapshot.data();


          setNombre(
            data.Nombre ||
            data.nombre ||
            ""
          );


          setDescripcion(
            data.Descripcion ||
            data.descripcion ||
            ""
          );


          setPrecio(
            data.precio !==
              undefined
              ? String(
                  data.precio
                )
              : ""
          );


          setStock(
            data.stock !==
              undefined
              ? String(
                  data.stock
                )
              : "0"
          );


          setCategoria(
            data.categoria ||
            ""
          );


          setImagen(
            data.imagen ||
            "/logo.png"
          );


          setProductoExiste(
            true
          );

        } catch (error) {

          console.error(
            "Error al obtener producto:",
            error
          );


          setProductoExiste(
            false
          );

        } finally {

          setCargando(
            false
          );

        }

      };


    obtenerProducto();

  }, [
    id,
    sucursal?.id,
  ]);


  /* =========================================
     SELECCIONAR IMAGEN
  ========================================= */

  const seleccionarImagen =
    (e) => {

      const archivo =
        e.target.files?.[0];


      if (!archivo) {
        return;
      }


      setImagenArchivo(
        archivo
      );


      const preview =
        URL.createObjectURL(
          archivo
        );


      setImagen(
        preview
      );

    };


  /* =========================================
     GUARDAR CAMBIOS
  ========================================= */

  const handleSubmit =
    async (e) => {

      e.preventDefault();


      if (
        !sucursal?.id
      ) {

        alert(
          "Primero seleccioná una sucursal."
        );

        return;
      }


      if (!id) {

        alert(
          "No se encontró el ID del producto."
        );

        return;
      }


      const precioNumero =
        Number(
          precio
        );


      const stockNumero =
        Number(
          stock
        );


      if (
        !Number.isFinite(
          precioNumero
        ) ||
        precioNumero < 0
      ) {

        alert(
          "Ingresá un precio válido."
        );

        return;
      }


      if (
        !Number.isFinite(
          stockNumero
        ) ||
        stockNumero < 0
      ) {

        alert(
          "Ingresá un stock válido."
        );

        return;
      }


      try {

        setGuardando(
          true
        );


        let imagenUrl =
          imagen ||
          "/logo.png";


        /* =====================================
           SUBIR IMAGEN NUEVA
        ===================================== */

        if (
          imagenArchivo
        ) {

          const nombreImagen =
            `${Date.now()}-${imagenArchivo.name}`;


          const imagenRef =
            ref(
              storage,
              `productos/${sucursal.id}/${nombreImagen}`
            );


          await uploadBytes(
            imagenRef,
            imagenArchivo
          );


          imagenUrl =
            await getDownloadURL(
              imagenRef
            );

        }


        /* =====================================
           ACTUALIZAR FIREBASE
        ===================================== */

        const productoRef =
          doc(
            db,
            "sucursales",
            sucursal.id,
            "productos",
            String(id)
          );


        await updateDoc(
          productoRef,
          {

            Nombre:
              nombre.trim(),

            Descripcion:
              descripcion.trim(),

            precio:
              precioNumero,

            stock:
              stockNumero,

            categoria,

            imagen:
              imagenUrl,

            actualizadoEn:
              serverTimestamp(),

          }
        );


        alert(
          "✅ Producto actualizado correctamente"
        );


        router.push(
          "/admin"
        );

      } catch (error) {

        console.error(
          "Error al editar producto:",
          error
        );


        alert(
          `No se pudo editar el producto.${
            error?.message
              ? `\n\n${error.message}`
              : ""
          }`
        );

      } finally {

        setGuardando(
          false
        );

      }

    };


  /* =========================================
     SIN USUARIO
  ========================================= */

  if (!user) {

    return (

      <div className="min-h-screen bg-[#1B120D] text-white flex items-center justify-center p-6">

        <p className="text-xl font-black">
          Cargando...
        </p>

      </div>

    );

  }


  /* =========================================
     SIN PERMISO
  ========================================= */

  if (
    user.email?.toLowerCase() !==
    ADMIN_EMAIL.toLowerCase()
  ) {

    return null;

  }


  /* =========================================
     SIN SUCURSAL
  ========================================= */

  if (!sucursal) {

    return (

      <div className="min-h-screen bg-[#1B120D] text-white flex items-center justify-center p-6">

        <div className="text-center max-w-md">

          <div className="text-5xl mb-4">
            🏪
          </div>


          <h1 className="text-2xl font-black">
            Falta seleccionar la sucursal
          </h1>


          <p className="text-white/70 mt-2">
            Volvé al panel y elegí el producto desde la sucursal correspondiente.
          </p>


          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin"
              )
            }
            className="mt-6 bg-[#E7C873] text-[#1B120D] px-6 py-3 rounded-xl font-black"
          >
            Volver al Panel
          </button>

        </div>

      </div>

    );

  }


  /* =========================================
     CARGANDO
  ========================================= */

  if (cargando) {

    return (

      <div className="min-h-screen bg-[#1B120D] text-white flex items-center justify-center p-6">

        <div className="text-center">

          <div className="text-5xl mb-4">
            🍕
          </div>

          <p className="text-xl font-black">
            Cargando producto...
          </p>

          <p className="text-white/60 mt-2">
            {sucursal.nombre}
          </p>

        </div>

      </div>

    );

  }


  /* =========================================
     PRODUCTO NO ENCONTRADO
  ========================================= */

  if (!productoExiste) {

    return (

      <div className="min-h-screen bg-[#1B120D] text-white flex flex-col items-center justify-center p-6 text-center">

        <div className="text-6xl mb-4">
          ❌
        </div>


        <h1 className="text-3xl font-black text-[#E7C873] mb-4">
          Producto no encontrado
        </h1>


        <p className="mb-2">
          No encontré este producto en:
        </p>


        <p className="font-black text-xl">
          {sucursal.nombre}
        </p>


        <p className="text-white/50 text-xs mt-3">
          ID: {String(id)}
        </p>


        <button
          type="button"
          onClick={() =>
            router.push(
              "/admin"
            )
          }
          className="mt-6 bg-[#7A4E35] text-white px-6 py-3 rounded-xl font-black"
        >
          ← Volver al admin
        </button>

      </div>

    );

  }


  /* =========================================
     PANTALLA
  ========================================= */

  return (

    <div className="min-h-screen bg-[#1B120D] p-4 md:p-8">


      <div className="max-w-3xl mx-auto">


        {/* CABECERA */}

        <div className="mb-5">

          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin"
              )
            }
            className="text-white/70 hover:text-white font-bold"
          >
            ← Volver al Panel
          </button>

        </div>


        <div className="bg-[#F8F5EF] text-[#2B2B2B] rounded-[2rem] shadow-2xl overflow-hidden">


          {/* HEADER */}

          <div className="bg-[#7A4E35] text-white p-6 md:p-8">

            <p className="text-[#E7C873] uppercase tracking-[0.25em] text-xs font-black">
              Pizzería Jope
            </p>


            <h1 className="text-3xl md:text-4xl font-black mt-2">
              Editar producto
            </h1>


            <div className="flex flex-wrap gap-2 mt-4">


              <span className="bg-white/10 px-3 py-2 rounded-full text-sm font-bold">
                🏪 {sucursal.nombre}
              </span>


              <span className="bg-white/10 px-3 py-2 rounded-full text-xs font-mono">
                ID: {String(id)}
              </span>


            </div>

          </div>


          {/* FORMULARIO */}

          <form
            onSubmit={
              handleSubmit
            }
            className="p-6 md:p-8 space-y-6"
          >


            {/* NOMBRE */}

            <div>

              <label className="block mb-2 font-black">
                Nombre
              </label>


              <input
                type="text"

                value={
                  nombre
                }

                onChange={(e) =>
                  setNombre(
                    e.target.value
                  )
                }

                className="border border-[#7A4E35]/20 p-4 w-full rounded-xl bg-white focus:outline-none focus:border-[#2F6B4F]"
                required
              />

            </div>


            {/* DESCRIPCIÓN */}

            <div>

              <label className="block mb-2 font-black">
                Descripción
              </label>


              <textarea
                value={
                  descripcion
                }

                onChange={(e) =>
                  setDescripcion(
                    e.target.value
                  )
                }

                rows={4}

                className="border border-[#7A4E35]/20 p-4 w-full rounded-xl bg-white resize-none focus:outline-none focus:border-[#2F6B4F]"
              />

            </div>


            {/* PRECIO + STOCK */}

            <div className="grid md:grid-cols-2 gap-4">


              <div>

                <label className="block mb-2 font-black">
                  💲 Precio
                </label>


                <input
                  type="number"

                  min="0"

                  step="1"

                  value={
                    precio
                  }

                  onChange={(e) =>
                    setPrecio(
                      e.target.value
                    )
                  }

                  className="border border-[#7A4E35]/20 p-4 w-full rounded-xl bg-white focus:outline-none focus:border-[#2F6B4F]"
                  required
                />

              </div>


              <div>

                <label className="block mb-2 font-black">
                  📦 Stock
                </label>


                <input
                  type="number"

                  min="0"

                  step="0.5"

                  value={
                    stock
                  }

                  onChange={(e) =>
                    setStock(
                      e.target.value
                    )
                  }

                  className="border border-[#7A4E35]/20 p-4 w-full rounded-xl bg-white focus:outline-none focus:border-[#2F6B4F]"
                  required
                />

                <p className="text-xs text-gray-500 mt-2">
                  Este es el mismo stock que usan la web, el POS y Producción.
                </p>

              </div>


            </div>


            {/* CATEGORÍA */}

            <div>

              <label className="block mb-2 font-black">
                Categoría
              </label>


              <select
                value={
                  categoria
                }

                onChange={(e) =>
                  setCategoria(
                    e.target.value
                  )
                }

                className="border border-[#7A4E35]/20 p-4 w-full rounded-xl bg-white focus:outline-none focus:border-[#2F6B4F]"
                required
              >

                <option value="">
                  Seleccionar categoría
                </option>

                <option value="pizzas">
                  Pizzas
                </option>

                <option value="empanadas">
                  Empanadas
                </option>

                <option value="hamburguesas">
                  Hamburguesas
                </option>

                <option value="bebidas">
                  Bebidas
                </option>

                <option value="promos">
                  Promos
                </option>

                <option value="tartas">
                  Tartas
                </option>

                <option value="calzones">
                  Calzones
                </option>

              </select>

            </div>


            {/* IMAGEN */}

            <div>

              <label className="block mb-3 font-black">
                📷 Imagen del producto
              </label>


              {imagen && (

                <div className="bg-white rounded-2xl overflow-hidden border border-[#7A4E35]/20 mb-4">

                  <img
                    src={
                      imagen
                    }

                    alt={
                      nombre ||
                      "Producto"
                    }

                    className="w-full h-64 object-cover"
                  />

                </div>

              )}


              <input
                type="file"

                accept="image/*"

                onChange={
                  seleccionarImagen
                }

                className="border border-[#7A4E35]/20 p-4 w-full rounded-xl bg-white"
              />


              <p className="text-xs text-gray-500 mt-2">
                Si no seleccionás una nueva imagen, se conserva la actual.
              </p>

            </div>


            {/* GUARDAR */}

            <button
              type="submit"

              disabled={
                guardando
              }

              className="w-full bg-[#2F6B4F] hover:bg-[#24563F] disabled:bg-gray-400 text-white px-6 py-4 rounded-xl font-black text-lg transition"
            >
              {
                guardando
                  ? "Guardando cambios..."
                  : "💾 Guardar cambios"
              }
            </button>


          </form>


        </div>


      </div>


    </div>

  );

};


export default EditarProductoPage;