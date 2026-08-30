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


function crearId(nombre) {
  return String(nombre || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}


function pinValido(pin) {
  return /^\d{4,6}$/.test(
    String(pin || "")
  );
}


async function hashPin(pin) {
  const bytes = new TextEncoder().encode(
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


export default function EmpleadasPanel() {

  const [
    empleadas,
    setEmpleadas,
  ] = useState([]);


  const [
    formularios,
    setFormularios,
  ] = useState({});


  const [
    filtroSucursal,
    setFiltroSucursal,
  ] = useState("todas");


  const [
    guardandoId,
    setGuardandoId,
  ] = useState(null);


  const [
    creando,
    setCreando,
  ] = useState(false);


  const [
    nueva,
    setNueva,
  ] = useState({
    nombre: "",
    sucursalId: "luiggi",
    precioDocena: "",
    pin: "",
  });


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
              .map((documento) => {

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

                  precioDocena:
                    Number(
                      data.precioDocena ||
                      0
                    ),

                  activa:
                    data.activa !== false,

                  pinConfigurado:
                    Boolean(
                      data.pinHash
                    ),

                  ...data,
                };
              })
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


          setFormularios(
            (prev) => {

              const siguiente =
                {};

              lista.forEach(
                (empleada) => {

                  siguiente[
                    empleada.id
                  ] = {

                    nombre:
                      prev[
                        empleada.id
                      ]?.nombre ??
                      empleada.nombre,

                    sucursalId:
                      prev[
                        empleada.id
                      ]?.sucursalId ??
                      empleada.sucursalId,

                    precioDocena:
                      prev[
                        empleada.id
                      ]?.precioDocena ??
                      String(
                        empleada.precioDocena
                      ),

                    pin:
                      prev[
                        empleada.id
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


  const empleadasFiltradas =
    useMemo(() => {

      if (
        filtroSucursal ===
        "todas"
      ) {
        return empleadas;
      }


      return empleadas.filter(
        (empleada) =>
          empleada.sucursalId ===
          filtroSucursal
      );

    }, [
      empleadas,
      filtroSucursal,
    ]);


  const cambiarCampo = (
    empleadaId,
    campo,
    valor
  ) => {

    setFormularios(
      (prev) => ({
        ...prev,

        [empleadaId]: {
          ...prev[
            empleadaId
          ],

          [campo]:
            valor,
        },
      })
    );

  };


  const guardarEmpleada =
    async (
      empleada
    ) => {

      const formulario =
        formularios[
          empleada.id
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


      const precioDocena =
        Number(
          formulario.precioDocena ||
          0
        );


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
        !Number.isFinite(
          precioDocena
        ) ||
        precioDocena < 0
      ) {

        Swal.fire({
          icon: "error",
          title:
            "Precio por docena inválido",
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
        empleada.id
      );


      try {

        const datos = {

          empleadaId:
            empleada.id,

          nombre,

          empleada:
            nombre,

          sucursalId,

          sucursalNombre:
            SUCURSALES[
              sucursalId
            ].nombre,

          precioDocena,

          activa:
            empleada.activa !==
            false,

          actualizadoEn:
            serverTimestamp(),

        };


        if (pin) {

          datos.pinHash =
            await hashPin(
              pin
            );

        }


        await setDoc(
          doc(
            db,
            "configuracionProduccion",
            empleada.id
          ),

          datos,

          {
            merge: true,
          }
        );


        setFormularios(
          (prev) => ({
            ...prev,

            [empleada.id]: {
              ...prev[
                empleada.id
              ],

              pin: "",
            },
          })
        );


        Swal.fire({
          icon: "success",
          title:
            "Empleada guardada",
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


  const cambiarEstado =
    async (
      empleada
    ) => {

      const nuevoEstado =
        !empleada.activa;


      const respuesta =
        await Swal.fire({

          icon:
            nuevoEstado
              ? "question"
              : "warning",

          title:
            nuevoEstado
              ? `¿Activar a ${empleada.nombre}?`
              : `¿Desactivar a ${empleada.nombre}?`,

          text:
            nuevoEstado
              ? "Podrá volver a ingresar a Producción."
              : "No podrá ingresar, pero no se borra su historial.",

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
            "configuracionProduccion",
            empleada.id
          ),

          {
            activa:
              nuevoEstado,

            actualizadoEn:
              serverTimestamp(),
          },

          {
            merge: true,
          }
        );

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


  const crearEmpleada =
    async () => {

      const nombre =
        String(
          nueva.nombre ||
          ""
        ).trim();


      const sucursalId =
        nueva.sucursalId;


      const precioDocena =
        Number(
          nueva.precioDocena ||
          0
        );


      const pin =
        String(
          nueva.pin ||
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
        !pinValido(pin)
      ) {

        Swal.fire({
          icon: "error",
          title:
            "Ingresá un PIN válido",
          text:
            "Usá entre 4 y 6 números.",
        });

        return;
      }


      if (
        !SUCURSALES[
          sucursalId
        ]
      ) {
        return;
      }


      if (
        !Number.isFinite(
          precioDocena
        ) ||
        precioDocena < 0
      ) {

        Swal.fire({
          icon: "error",
          title:
            "Precio por docena inválido",
        });

        return;
      }


      const empleadaId =
        crearId(
          nombre
        );


      if (!empleadaId) {
        return;
      }


      setCreando(
        true
      );


      try {

        const referencia =
          doc(
            db,
            "configuracionProduccion",
            empleadaId
          );


        const existente =
          await getDoc(
            referencia
          );


        if (
          existente.exists()
        ) {

          throw new Error(
            "Ya existe una empleada con un nombre similar."
          );

        }


        const pinHash =
          await hashPin(
            pin
          );


        await setDoc(
          referencia,

          {
            empleadaId,

            nombre,

            empleada:
              nombre,

            sucursalId,

            sucursalNombre:
              SUCURSALES[
                sucursalId
              ].nombre,

            precioDocena,

            pinHash,

            activa:
              true,

            creadoEn:
              serverTimestamp(),

            actualizadoEn:
              serverTimestamp(),
          }
        );


        setNueva({
          nombre: "",
          sucursalId:
            "luiggi",
          precioDocena: "",
          pin: "",
        });


        Swal.fire({
          icon: "success",
          title:
            `${nombre} agregada`,
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


  return (

    <div className="space-y-6">


      <section className="bg-white rounded-3xl border border-black/5 shadow-sm p-4 md:p-6">


        <h2 className="text-2xl font-black text-[#7A4E35]">
          👥 Empleadas
        </h2>


        <p className="text-gray-500 mt-2">
          Asigná sucursal, pago por docena
          y PIN personal de acceso a Producción.
        </p>


        <div className="flex flex-wrap gap-2 mt-6">

          {[
            {
              id: "todas",
              nombre: "Todas",
            },
            {
              id: "luiggi",
              nombre:
                "Ingeniero Luiggi",
            },
            {
              id: "santa_rosa",
              nombre:
                "Santa Rosa",
            },
          ].map(
            (opcion) => (

              <button
                key={
                  opcion.id
                }
                type="button"
                onClick={() =>
                  setFiltroSucursal(
                    opcion.id
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
                    opcion.id
                      ? "bg-[#7A4E35] text-white"
                      : "bg-[#F3EEE8] text-[#59463B]"
                  }
                `}
              >
                {
                  opcion.nombre
                }
              </button>

            )
          )}

        </div>


        <div className="grid lg:grid-cols-2 gap-5 mt-6">

          {
            empleadasFiltradas.map(
              (empleada) => {

                const form =
                  formularios[
                    empleada.id
                  ] || {

                    nombre:
                      empleada.nombre,

                    sucursalId:
                      empleada.sucursalId,

                    precioDocena:
                      String(
                        empleada.precioDocena
                      ),

                    pin: "",
                  };


                return (

                  <article
                    key={
                      empleada.id
                    }
                    className={`
                      rounded-3xl
                      border
                      p-5

                      ${
                        empleada.activa
                          ? "bg-white border-gray-200"
                          : "bg-gray-100 border-gray-300"
                      }
                    `}
                  >


                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <p className="text-xs text-gray-400 font-mono">
                          ID:{" "}
                          {
                            empleada.id
                          }
                        </p>


                        <h3 className="text-2xl font-black mt-1">
                          {
                            empleada.nombre
                          }
                        </h3>


                        <p className="text-sm text-gray-500 mt-1">
                          📍{" "}
                          {
                            empleada.sucursalNombre
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
                            empleada.activa
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-600"
                          }
                        `}
                      >
                        {
                          empleada.activa
                            ? "ACTIVA"
                            : "INACTIVA"
                        }
                      </span>

                    </div>


                    <div className="space-y-4 mt-5">


                      <div>

                        <label className="block text-sm font-black mb-2">
                          Nombre
                        </label>

                        <input
                          value={
                            form.nombre
                          }
                          onChange={(e) =>
                            cambiarCampo(
                              empleada.id,
                              "nombre",
                              e.target.value
                            )
                          }
                          className="w-full border border-gray-300 rounded-xl p-3 bg-white"
                        />

                      </div>


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
                              empleada.id,
                              "sucursalId",
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


                      <div>

                        <label className="block text-sm font-black mb-2">
                          Pago por docena
                        </label>

                        <input
                          type="number"
                          min="0"
                          value={
                            form.precioDocena
                          }
                          onChange={(e) =>
                            cambiarCampo(
                              empleada.id,
                              "precioDocena",
                              e.target.value
                            )
                          }
                          className="w-full border border-gray-300 rounded-xl p-3 bg-white"
                        />

                      </div>


                      <div>

                        <label className="block text-sm font-black mb-2">
                          PIN
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
                              empleada.id,
                              "pin",
                              e.target.value.replace(
                                /\D/g,
                                ""
                              )
                            )
                          }
                          placeholder={
                            empleada.pinConfigurado
                              ? "•••• Dejar vacío para conservar"
                              : "Crear PIN de 4 a 6 números"
                          }
                          className="w-full border border-gray-300 rounded-xl p-3 bg-white"
                        />

                        <p className="text-xs text-gray-500 mt-2">
                          {
                            empleada.pinConfigurado
                              ? "🔐 PIN configurado"
                              : "⚠️ Falta configurar PIN"
                          }
                        </p>

                      </div>


                    </div>


                    <div className="grid grid-cols-2 gap-2 mt-5">

                      <button
                        type="button"
                        onClick={() =>
                          guardarEmpleada(
                            empleada
                          )
                        }
                        disabled={
                          guardandoId ===
                          empleada.id
                        }
                        className="bg-[#7A4E35] disabled:bg-gray-400 text-white rounded-xl py-3 font-black"
                      >
                        {
                          guardandoId ===
                          empleada.id
                            ? "Guardando..."
                            : "💾 Guardar"
                        }
                      </button>


                      <button
                        type="button"
                        onClick={() =>
                          cambiarEstado(
                            empleada
                          )
                        }
                        className={`
                          rounded-xl
                          py-3
                          font-black

                          ${
                            empleada.activa
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }
                        `}
                      >
                        {
                          empleada.activa
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

        </div>


      </section>


      <section className="bg-white rounded-3xl border border-black/5 shadow-sm p-4 md:p-6">


        <h2 className="text-2xl font-black text-[#7A4E35]">
          ➕ Nueva empleada
        </h2>


        <div className="grid md:grid-cols-2 gap-4 mt-5">


          <div>

            <label className="block text-sm font-black mb-2">
              Nombre
            </label>

            <input
              value={
                nueva.nombre
              }
              onChange={(e) =>
                setNueva(
                  (prev) => ({
                    ...prev,

                    nombre:
                      e.target.value,
                  })
                )
              }
              placeholder="Ej.: Sofi"
              className="w-full border border-gray-300 rounded-xl p-3 bg-white"
            />

          </div>


          <div>

            <label className="block text-sm font-black mb-2">
              Sucursal
            </label>

            <select
              value={
                nueva.sucursalId
              }
              onChange={(e) =>
                setNueva(
                  (prev) => ({
                    ...prev,

                    sucursalId:
                      e.target.value,
                  })
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


          <div>

            <label className="block text-sm font-black mb-2">
              Pago por docena
            </label>

            <input
              type="number"
              min="0"
              value={
                nueva.precioDocena
              }
              onChange={(e) =>
                setNueva(
                  (prev) => ({
                    ...prev,

                    precioDocena:
                      e.target.value,
                  })
                )
              }
              className="w-full border border-gray-300 rounded-xl p-3 bg-white"
            />

          </div>


          <div>

            <label className="block text-sm font-black mb-2">
              PIN de acceso
            </label>

            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={
                nueva.pin
              }
              onChange={(e) =>
                setNueva(
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
              placeholder="4 a 6 números"
              className="w-full border border-gray-300 rounded-xl p-3 bg-white"
            />

          </div>


        </div>


        <button
          type="button"
          onClick={
            crearEmpleada
          }
          disabled={
            creando
          }
          className="mt-5 bg-[#2F6B4F] disabled:bg-gray-400 text-white px-6 py-4 rounded-xl font-black"
        >
          {
            creando
              ? "Creando..."
              : "➕ Crear empleada"
          }
        </button>


      </section>


    </div>

  );
}