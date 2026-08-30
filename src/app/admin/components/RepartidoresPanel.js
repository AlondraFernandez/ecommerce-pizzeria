"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import Swal from "sweetalert2";

import { db } from "../../lib/firebase";


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
   CREAR ID
====================================================== */

function crearId(nombre) {
  return String(nombre || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}


/* ======================================================
   VALIDAR PIN
====================================================== */

function pinValido(pin) {
  return /^\d{4,6}$/.test(
    String(pin || "")
  );
}


/* ======================================================
   HASH PIN
====================================================== */

async function hashPin(pin) {
  const bytes =
    new TextEncoder().encode(
      String(pin)
    );

  const buffer =
    await crypto.subtle.digest(
      "SHA-256",
      bytes
    );

  return Array.from(
    new Uint8Array(buffer)
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

export default function RepartidoresPanel() {

  const [
    repartidores,
    setRepartidores,
  ] = useState([]);


  const [
    formularios,
    setFormularios,
  ] = useState({});


  const [
    filtroSucursal,
    setFiltroSucursal,
  ] = useState("todos");


  const [
    guardandoId,
    setGuardandoId,
  ] = useState(null);


  const [
    creando,
    setCreando,
  ] = useState(false);


  const [
    nuevo,
    setNuevo,
  ] = useState({
    nombre: "",
    sucursalId: "luiggi",
    pin: "",
  });


  /* ====================================================
     LEER REPARTIDORES
  ==================================================== */

  useEffect(() => {

    const unsubscribe =
      onSnapshot(
        collection(
          db,
          "repartidores"
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
                      documento.id,

                    sucursalId,

                    sucursalNombre:
                      data.sucursalNombre ||
                      SUCURSALES[
                        sucursalId
                      ]?.nombre ||
                      sucursalId,

                    activo:
                      data.activo !==
                      false,

                    pinConfigurado:
                      Boolean(
                        data.pinHash
                      ),

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


          setRepartidores(
            lista
          );


          setFormularios(
            (prev) => {

              const siguiente =
                {};


              lista.forEach(
                (repartidor) => {

                  siguiente[
                    repartidor.id
                  ] = {

                    nombre:
                      prev[
                        repartidor.id
                      ]?.nombre ??
                      repartidor.nombre,

                    sucursalId:
                      prev[
                        repartidor.id
                      ]?.sucursalId ??
                      repartidor.sucursalId,

                    pin:
                      prev[
                        repartidor.id
                      ]?.pin ??
                      "",
                  };

                }
              );


              return siguiente;

            }
          );

        },

        (error) => {

          console.error(
            "Error cargando repartidores:",
            error
          );


          Swal.fire({
            icon: "error",

            title:
              "No se pudieron cargar los repartidores",
          });

        }
      );


    return () =>
      unsubscribe();

  }, []);


  /* ====================================================
     FILTRAR
  ==================================================== */

  const repartidoresFiltrados =
    useMemo(() => {

      if (
        filtroSucursal ===
        "todos"
      ) {
        return repartidores;
      }


      return repartidores.filter(
        (repartidor) =>
          repartidor.sucursalId ===
          filtroSucursal
      );

    }, [
      repartidores,
      filtroSucursal,
    ]);


  /* ====================================================
     CAMBIAR FORMULARIO
  ==================================================== */

  const cambiarCampo = (
    repartidorId,
    campo,
    valor
  ) => {

    setFormularios(
      (prev) => ({
        ...prev,

        [repartidorId]: {
          ...prev[
            repartidorId
          ],

          [campo]:
            valor,
        },
      })
    );

  };


  /* ====================================================
     GUARDAR REPARTIDOR
  ==================================================== */

  const guardarRepartidor =
    async (
      repartidor
    ) => {

      const formulario =
        formularios[
          repartidor.id
        ];


      if (!formulario) {
        return;
      }


      const nombre =
        String(
          formulario.nombre ||
          ""
        ).trim();


      const sucursalId =
        formulario.sucursalId;


      const pin =
        String(
          formulario.pin ||
          ""
        ).trim();


      if (!nombre) {

        Swal.fire({
          icon: "error",

          title:
            "Ingresá el nombre",
        });

        return;
      }


      if (
        !SUCURSALES[
          sucursalId
        ]
      ) {

        Swal.fire({
          icon: "error",

          title:
            "Sucursal inválida",
        });

        return;
      }


      if (
        pin &&
        !pinValido(pin)
      ) {

        Swal.fire({
          icon: "error",

          title:
            "PIN inválido",

          text:
            "El PIN debe tener entre 4 y 6 números.",
        });

        return;
      }


      setGuardandoId(
        repartidor.id
      );


      try {

        const datos = {

          repartidorId:
            repartidor.id,

          nombre,

          sucursalId,

          sucursalNombre:
            SUCURSALES[
              sucursalId
            ].nombre,

          activo:
            repartidor.activo !==
            false,

          actualizadoEn:
            serverTimestamp(),
        };


        /*
         * Solo cambia el PIN
         * si escribimos uno nuevo.
         */

        if (pin) {

          datos.pinHash =
            await hashPin(
              pin
            );

        }


        await setDoc(
          doc(
            db,
            "repartidores",
            repartidor.id
          ),

          datos,

          {
            merge: true,
          }
        );


        setFormularios(
          (prev) => ({
            ...prev,

            [repartidor.id]: {
              ...prev[
                repartidor.id
              ],

              pin: "",
            },
          })
        );


        Swal.fire({
          icon: "success",

          title:
            "Repartidor actualizado",

          timer: 1300,

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
            "No se pudo guardar",

          text:
            error?.message ||
            "Volvé a intentar.",
        });

      } finally {

        setGuardandoId(
          null
        );

      }

    };


  /* ====================================================
     ACTIVAR / DESACTIVAR
  ==================================================== */

  const cambiarEstado =
    async (
      repartidor
    ) => {

      const nuevoEstado =
        !repartidor.activo;


      const respuesta =
        await Swal.fire({

          icon:
            nuevoEstado
              ? "question"
              : "warning",

          title:
            nuevoEstado
              ? `¿Activar a ${repartidor.nombre}?`
              : `¿Desactivar a ${repartidor.nombre}?`,

          text:
            nuevoEstado
              ? "Podrá volver a ingresar al sistema de delivery."
              : "No podrá ingresar como repartidor.",

          showCancelButton:
            true,

          confirmButtonText:
            nuevoEstado
              ? "Activar"
              : "Desactivar",

          cancelButtonText:
            "Cancelar",
        });


      if (
        !respuesta.isConfirmed
      ) {
        return;
      }


      try {

        await setDoc(
          doc(
            db,
            "repartidores",
            repartidor.id
          ),

          {
            activo:
              nuevoEstado,

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
            nuevoEstado
              ? "Repartidor activado"
              : "Repartidor desactivado",

          timer: 1200,

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
            "No se pudo cambiar el estado",
        });

      }

    };


  /* ====================================================
     CREAR REPARTIDOR
  ==================================================== */

  const crearRepartidor =
    async () => {

      const nombre =
        String(
          nuevo.nombre ||
          ""
        ).trim();


      const sucursalId =
        nuevo.sucursalId;


      const pin =
        String(
          nuevo.pin ||
          ""
        ).trim();


      if (!nombre) {

        Swal.fire({
          icon: "error",

          title:
            "Ingresá el nombre",
        });

        return;
      }


      if (
        !SUCURSALES[
          sucursalId
        ]
      ) {

        Swal.fire({
          icon: "error",

          title:
            "Elegí una sucursal",
        });

        return;
      }


      if (
        !pinValido(pin)
      ) {

        Swal.fire({
          icon: "error",

          title:
            "PIN inválido",

          text:
            "Usá entre 4 y 6 números.",
        });

        return;
      }


      const repartidorId =
        crearId(
          nombre
        );


      if (
        !repartidorId
      ) {
        return;
      }


      setCreando(
        true
      );


      try {

        const referencia =
          doc(
            db,
            "repartidores",
            repartidorId
          );


        const existente =
          await getDoc(
            referencia
          );


        if (
          existente.exists()
        ) {

          throw new Error(
            "Ya existe un repartidor con un nombre similar."
          );

        }


        const pinHash =
          await hashPin(
            pin
          );


        await setDoc(
          referencia,

          {
            repartidorId,

            nombre,

            sucursalId,

            sucursalNombre:
              SUCURSALES[
                sucursalId
              ].nombre,

            pinHash,

            activo:
              true,

            creadoEn:
              serverTimestamp(),

            actualizadoEn:
              serverTimestamp(),
          }
        );


        setNuevo({
          nombre: "",
          sucursalId:
            "luiggi",
          pin: "",
        });


        Swal.fire({
          icon: "success",

          title:
            `${nombre} agregado`,

          timer: 1400,

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
            "No se pudo crear",

          text:
            error?.message ||
            "Volvé a intentar.",
        });

      } finally {

        setCreando(
          false
        );

      }

    };


  /* ====================================================
     UI
  ==================================================== */

  return (

    <div className="space-y-6">


      {/* ================================================
          LISTA
      ================================================= */}

      <section className="bg-white rounded-3xl border border-black/5 shadow-sm p-4 md:p-6">


        <div>

          <p className="text-xs uppercase tracking-[0.2em] font-black text-[#2F6B4F]">
            Delivery
          </p>


          <h2 className="text-3xl font-black text-[#1B120D] mt-1">
            🛵 Repartidores
          </h2>


          <p className="text-gray-500 mt-2">
            Administrá los repartidores de cada sucursal y su PIN de acceso.
          </p>

        </div>


        {/* FILTROS */}

        <div className="flex flex-wrap gap-2 mt-6">


          <button
            type="button"

            onClick={() =>
              setFiltroSucursal(
                "todos"
              )
            }

            className={`
              px-4
              py-2
              rounded-full
              font-black
              text-sm

              ${
                filtroSucursal ===
                "todos"

                  ? "bg-[#1B120D] text-white"

                  : "bg-gray-100 text-gray-600"
              }
            `}
          >
            Todos
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
              py-2
              rounded-full
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
            Ingeniero Luiggi
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
              py-2
              rounded-full
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


        {/* CARDS */}

        <div className="grid lg:grid-cols-2 gap-5 mt-6">


          {
            repartidoresFiltrados.map(
              (
                repartidor
              ) => {

                const form =
                  formularios[
                    repartidor.id
                  ] || {

                    nombre:
                      repartidor.nombre,

                    sucursalId:
                      repartidor.sucursalId,

                    pin: "",
                  };


                return (

                  <article
                    key={
                      repartidor.id
                    }

                    className={`
                      rounded-3xl
                      border
                      p-5

                      ${
                        repartidor.activo

                          ? "bg-white border-gray-200"

                          : "bg-gray-100 border-gray-300"
                      }
                    `}
                  >


                    <div className="flex justify-between items-start gap-3">


                      <div>

                        <p className="text-xs font-mono text-gray-400">
                          ID:{" "}
                          {
                            repartidor.id
                          }
                        </p>


                        <h3 className="text-2xl font-black mt-1">
                          🛵{" "}
                          {
                            repartidor.nombre
                          }
                        </h3>


                        <p className="text-sm text-gray-500 mt-2">
                          📍{" "}
                          {
                            repartidor.sucursalNombre
                          }
                        </p>

                      </div>


                      <span
                        className={`
                          px-3
                          py-1.5
                          rounded-full
                          text-xs
                          font-black

                          ${
                            repartidor.activo

                              ? "bg-green-100 text-green-700"

                              : "bg-gray-200 text-gray-600"
                          }
                        `}
                      >

                        {
                          repartidor.activo
                            ? "ACTIVO"
                            : "INACTIVO"
                        }

                      </span>


                    </div>


                    <div className="space-y-4 mt-5">


                      {/* NOMBRE */}

                      <div>

                        <label className="block text-sm font-black mb-2">
                          Nombre
                        </label>


                        <input
                          type="text"

                          value={
                            form.nombre
                          }

                          onChange={(e) =>
                            cambiarCampo(
                              repartidor.id,
                              "nombre",
                              e.target.value
                            )
                          }

                          className="w-full p-3 border border-gray-300 rounded-xl bg-white"
                        />

                      </div>


                      {/* SUCURSAL */}

                      <div>

                        <label className="block text-sm font-black mb-2">
                          Sucursal
                        </label>


                        <select
                          value={
                            form.sucursalId
                          }

                          onChange={(e) =>
                            cambiarCampo(
                              repartidor.id,
                              "sucursalId",
                              e.target.value
                            )
                          }

                          className="w-full p-3 border border-gray-300 rounded-xl bg-white"
                        >

                          <option value="luiggi">
                            Ingeniero Luiggi
                          </option>

                          <option value="santa_rosa">
                            Santa Rosa
                          </option>

                        </select>

                      </div>


                      {/* PIN */}

                      <div>

                        <label className="block text-sm font-black mb-2">
                          Nuevo PIN
                        </label>


                        <input
                          type="password"

                          inputMode="numeric"

                          maxLength={6}

                          value={
                            form.pin
                          }

                          onChange={(e) =>
                            cambiarCampo(
                              repartidor.id,
                              "pin",

                              e.target.value.replace(
                                /\D/g,
                                ""
                              )
                            )
                          }

                          placeholder={
                            repartidor.pinConfigurado
                              ? "•••• Dejar vacío para conservar"
                              : "Crear PIN de 4 a 6 números"
                          }

                          className="w-full p-3 border border-gray-300 rounded-xl bg-white"
                        />


                        <p className="text-xs text-gray-500 mt-2">

                          {
                            repartidor.pinConfigurado
                              ? "🔐 PIN configurado"
                              : "⚠️ Todavía no tiene PIN"
                          }

                        </p>

                      </div>


                    </div>


                    {/* BOTONES */}

                    <div className="grid grid-cols-2 gap-2 mt-5">


                      <button
                        type="button"

                        onClick={() =>
                          guardarRepartidor(
                            repartidor
                          )
                        }

                        disabled={
                          guardandoId ===
                          repartidor.id
                        }

                        className="bg-[#7A4E35] disabled:bg-gray-400 text-white py-3 rounded-xl font-black"
                      >

                        {
                          guardandoId ===
                          repartidor.id

                            ? "Guardando..."

                            : "💾 Guardar"
                        }

                      </button>


                      <button
                        type="button"

                        onClick={() =>
                          cambiarEstado(
                            repartidor
                          )
                        }

                        className={`
                          py-3
                          rounded-xl
                          font-black

                          ${
                            repartidor.activo

                              ? "bg-red-100 text-red-700"

                              : "bg-green-100 text-green-700"
                          }
                        `}
                      >

                        {
                          repartidor.activo
                            ? "Desactivar"
                            : "Activar"
                        }

                      </button>


                    </div>


                  </article>

                );

              }
            )
          }


          {
            repartidoresFiltrados.length ===
            0 && (

              <div className="lg:col-span-2 border border-dashed border-gray-300 rounded-3xl p-10 text-center">

                <div className="text-5xl">
                  🛵
                </div>

                <p className="font-black text-xl mt-3">
                  No hay repartidores
                </p>

                <p className="text-gray-500 mt-1">
                  Podés crear el primero abajo.
                </p>

              </div>

            )
          }


        </div>


      </section>


      {/* ================================================
          CREAR NUEVO
      ================================================= */}

      <section className="bg-white rounded-3xl border border-black/5 shadow-sm p-4 md:p-6">


        <p className="text-xs uppercase tracking-[0.2em] font-black text-[#2F6B4F]">
          Nuevo acceso
        </p>


        <h2 className="text-2xl font-black text-[#7A4E35] mt-1">
          ➕ Agregar repartidor
        </h2>


        <p className="text-gray-500 mt-2">
          El PIN será el que usará para entrar a Jope Delivery.
        </p>


        <div className="grid md:grid-cols-3 gap-4 mt-5">


          {/* NOMBRE */}

          <div>

            <label className="block text-sm font-black mb-2">
              Nombre
            </label>


            <input
              type="text"

              value={
                nuevo.nombre
              }

              onChange={(e) =>
                setNuevo(
                  (prev) => ({
                    ...prev,

                    nombre:
                      e.target.value,
                  })
                )
              }

              placeholder="Ej: Nico"

              className="w-full p-3 border border-gray-300 rounded-xl"
            />

          </div>


          {/* SUCURSAL */}

          <div>

            <label className="block text-sm font-black mb-2">
              Sucursal
            </label>


            <select
              value={
                nuevo.sucursalId
              }

              onChange={(e) =>
                setNuevo(
                  (prev) => ({
                    ...prev,

                    sucursalId:
                      e.target.value,
                  })
                )
              }

              className="w-full p-3 border border-gray-300 rounded-xl bg-white"
            >

              <option value="luiggi">
                Ingeniero Luiggi
              </option>

              <option value="santa_rosa">
                Santa Rosa
              </option>

            </select>

          </div>


          {/* PIN */}

          <div>

            <label className="block text-sm font-black mb-2">
              PIN
            </label>


            <input
              type="password"

              inputMode="numeric"

              maxLength={6}

              value={
                nuevo.pin
              }

              onChange={(e) =>
                setNuevo(
                  (prev) => ({
                    ...prev,

                    pin:
                      e.target.value.replace(
                        /\D/g,
                        ""
                      ),
                  })
                )
              }

              placeholder="Ej: 1234"

              className="w-full p-3 border border-gray-300 rounded-xl"
            />

          </div>


        </div>


        <button
          type="button"

          onClick={
            crearRepartidor
          }

          disabled={
            creando
          }

          className="mt-5 bg-[#2F6B4F] disabled:bg-gray-400 text-white px-7 py-4 rounded-xl font-black"
        >

          {
            creando
              ? "Creando..."
              : "🛵 Crear repartidor"
          }

        </button>


      </section>


    </div>

  );

}