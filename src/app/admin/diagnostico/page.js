"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";

const ADMIN_EMAIL = "alondra2017gaitan@gmail.com";

// ============================================================
// CONVIERTE CUALQUIER FORMATO DE FECHA A Date
// ============================================================

function convertirFecha(valor) {
  if (!valor) return null;

  // Firestore Timestamp
  if (valor && typeof valor.toDate === "function") {
    const fecha = valor.toDate();

    if (!isNaN(fecha.getTime())) {
      return fecha;
    }
  }

  // Date de JavaScript
  if (valor instanceof Date) {
    if (!isNaN(valor.getTime())) {
      return valor;
    }

    return null;
  }

  // Número / timestamp
  if (typeof valor === "number") {
    // Segundos
    if (valor < 100000000000) {
      const fecha = new Date(valor * 1000);

      if (!isNaN(fecha.getTime())) {
        return fecha;
      }
    }

    // Milisegundos
    const fecha = new Date(valor);

    if (!isNaN(fecha.getTime())) {
      return fecha;
    }
  }

  // String
  if (typeof valor === "string") {
    const texto = valor.trim();

    if (!texto) return null;

    // YYYY-MM-DD
    const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      const año = Number(match[1]);
      const mes = Number(match[2]);
      const dia = Number(match[3]);

      const fecha = new Date(año, mes - 1, dia);

      if (!isNaN(fecha.getTime())) {
        return fecha;
      }
    }

    const fecha = new Date(texto);

    if (!isNaN(fecha.getTime())) {
      return fecha;
    }
  }

  return null;
}

// ============================================================
// BUSCA FECHAS DENTRO DE UN DOCUMENTO
// ============================================================

function obtenerFechasDocumento(data) {
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
    "created",
    "creationDate",
  ];

  const fechas = [];

  for (const campo of candidatos) {
    if (!(campo in data)) continue;

    const fecha = convertirFecha(data[campo]);

    if (fecha) {
      fechas.push({
        campo,
        fecha,
      });
    }
  }

  return fechas;
}

// ============================================================
// FORMATEAR FECHA
// ============================================================

function formatearFecha(fecha) {
  if (!fecha) return "—";

  return fecha.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ============================================================
// OBTENER FECHA MÁS ANTIGUA DE UNA COLECCIÓN
// ============================================================

function analizarDocumentos(snapshot) {
  let fechaMasAntigua = null;
  let fechaMasReciente = null;

  const camposFecha = new Set();

  let documentosConFecha = 0;
  let documentosSinFecha = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    const fechas = obtenerFechasDocumento(data);

    if (fechas.length === 0) {
      documentosSinFecha++;
      return;
    }

    documentosConFecha++;

    for (const item of fechas) {
      camposFecha.add(item.campo);

      if (
        !fechaMasAntigua ||
        item.fecha.getTime() < fechaMasAntigua.getTime()
      ) {
        fechaMasAntigua = item.fecha;
      }

      if (
        !fechaMasReciente ||
        item.fecha.getTime() > fechaMasReciente.getTime()
      ) {
        fechaMasReciente = item.fecha;
      }
    }
  });

  return {
    cantidad: snapshot.size,
    fechaMasAntigua,
    fechaMasReciente,
    documentosConFecha,
    documentosSinFecha,
    camposFecha: Array.from(camposFecha),
  };
}

// ============================================================
// PÁGINA
// ============================================================

export default function DiagnosticoFirestorePage() {
  const { user, loading: authLoading } = useAuth();

  const [colecciones, setColecciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [progreso, setProgreso] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setError("No hay usuario autenticado.");
      setCargando(false);
      return;
    }

    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setError("No tenés permisos para acceder a este diagnóstico.");
      setCargando(false);
      return;
    }

    diagnosticarFirestore();
  }, [user, authLoading]);

  async function diagnosticarFirestore() {
    setCargando(true);
    setError("");
    setColecciones([]);

    try {
      /*
       * Firestore Web SDK NO permite listar automáticamente todas
       * las colecciones raíz de una base de datos desde el navegador.
       *
       * Por eso primero incluimos las colecciones que utiliza tu sistema.
       *
       * Si aparece otra colección en Firebase que no está acá,
       * la agregamos y volvemos a ejecutar.
       */

      const coleccionesConocidas = [
        "ventasPOS",
        "pedidosDelivery",
        "pedidosWeb",
        "cierresCaja",
        "cancelaciones",
        "movimientosStock",
        "producciones",
        "pagosProduccion",
        "configuracionProduccion",
      ];

      const resultados = [];

      for (let i = 0; i < coleccionesConocidas.length; i++) {
        const nombre = coleccionesConocidas[i];

        setProgreso(
          `Revisando ${nombre} (${i + 1}/${coleccionesConocidas.length})...`
        );

        try {
          const referencia = collection(db, nombre);

          const snapshot = await getDocs(referencia);

          const analisis = analizarDocumentos(snapshot);

          resultados.push({
            nombre,
            ...analisis,
            estado: "OK",
          });
        } catch (errorColeccion) {
          console.error(
            `Error leyendo colección ${nombre}:`,
            errorColeccion
          );

          resultados.push({
            nombre,
            cantidad: null,
            fechaMasAntigua: null,
            fechaMasReciente: null,
            documentosConFecha: 0,
            documentosSinFecha: 0,
            camposFecha: [],
            estado: "ERROR",
            error: errorColeccion?.message || "Error desconocido",
          });
        }
      }

      // Ordenar de mayor cantidad de documentos a menor
      resultados.sort((a, b) => {
        if (a.cantidad === null) return 1;
        if (b.cantidad === null) return -1;

        return b.cantidad - a.cantidad;
      });

      setColecciones(resultados);
      setProgreso("Diagnóstico terminado.");
    } catch (errorGeneral) {
      console.error("Error general:", errorGeneral);

      setError(
        errorGeneral?.message ||
          "Ocurrió un error al revisar Firestore."
      );

      setProgreso("");
    } finally {
      setCargando(false);
    }
  }

  if (authLoading) {
    return (
      <main style={estilos.contenedor}>
        <div style={estilos.cargando}>
          Verificando usuario...
        </div>
      </main>
    );
  }

  if (error && !colecciones.length) {
    return (
      <main style={estilos.contenedor}>
        <div style={estilos.tarjetaError}>
          <h1 style={estilos.titulo}>Diagnóstico Firestore</h1>

          <p style={estilos.error}>
            {error}
          </p>
        </div>
      </main>
    );
  }

  const totalDocumentos = colecciones.reduce((total, item) => {
    return total + (item.cantidad || 0);
  }, 0);

  const coleccionesOK = colecciones.filter(
    (item) => item.estado === "OK"
  ).length;

  const coleccionesError = colecciones.filter(
    (item) => item.estado === "ERROR"
  ).length;

  return (
    <main style={estilos.contenedor}>
      <div style={estilos.cabecera}>
        <div>
          <h1 style={estilos.titulo}>
            🔎 Diagnóstico de Firestore
          </h1>

          <p style={estilos.subtitulo}>
            Revisión de las colecciones utilizadas por Pizzería Jope.
          </p>
        </div>

        <button
          onClick={diagnosticarFirestore}
          disabled={cargando}
          style={estilos.boton}
        >
          {cargando ? "Revisando..." : "🔄 Volver a revisar"}
        </button>
      </div>

      {progreso && (
        <div style={estilos.progreso}>
          {progreso}
        </div>
      )}

      {error && (
        <div style={estilos.alerta}>
          ⚠️ {error}
        </div>
      )}

      <div style={estilos.resumen}>
        <div style={estilos.cardResumen}>
          <span style={estilos.numero}>
            {colecciones.length}
          </span>

          <span style={estilos.label}>
            Colecciones revisadas
          </span>
        </div>

        <div style={estilos.cardResumen}>
          <span style={estilos.numero}>
            {totalDocumentos}
          </span>

          <span style={estilos.label}>
            Documentos encontrados
          </span>
        </div>

        <div style={estilos.cardResumen}>
          <span style={estilos.numero}>
            {coleccionesOK}
          </span>

          <span style={estilos.label}>
            Colecciones OK
          </span>
        </div>

        <div style={estilos.cardResumen}>
          <span
            style={{
              ...estilos.numero,
              color:
                coleccionesError > 0
                  ? "#dc2626"
                  : "#16a34a",
            }}
          >
            {coleccionesError}
          </span>

          <span style={estilos.label}>
            Con error
          </span>
        </div>
      </div>

      <div style={estilos.nota}>
        <strong>Importante:</strong> este diagnóstico no modifica,
        elimina ni actualiza ningún documento de Firestore.
        Solamente realiza lecturas.
      </div>

      <div style={estilos.tablaContenedor}>
        <table style={estilos.tabla}>
          <thead>
            <tr>
              <th style={estilos.th}>Colección</th>
              <th style={estilos.th}>Documentos</th>
              <th style={estilos.th}>Fecha más antigua</th>
              <th style={estilos.th}>Fecha más reciente</th>
              <th style={estilos.th}>Con fecha</th>
              <th style={estilos.th}>Sin fecha</th>
              <th style={estilos.th}>Campos detectados</th>
              <th style={estilos.th}>Estado</th>
            </tr>
          </thead>

          <tbody>
            {colecciones.map((item) => (
              <tr key={item.nombre}>
                <td style={estilos.td}>
                  <strong>
                    {item.nombre}
                  </strong>
                </td>

                <td style={estilos.td}>
                  {item.cantidad ?? "—"}
                </td>

                <td style={estilos.td}>
                  {formatearFecha(
                    item.fechaMasAntigua
                  )}
                </td>

                <td style={estilos.td}>
                  {formatearFecha(
                    item.fechaMasReciente
                  )}
                </td>

                <td style={estilos.td}>
                  {item.documentosConFecha}
                </td>

                <td style={estilos.td}>
                  {item.documentosSinFecha}
                </td>

                <td style={estilos.td}>
                  {item.camposFecha?.length > 0
                    ? item.camposFecha.join(", ")
                    : "No detectados"}
                </td>

                <td style={estilos.td}>
                  {item.estado === "OK" ? (
                    <span style={estilos.ok}>
                      ✅ OK
                    </span>
                  ) : (
                    <span style={estilos.errorEstado}>
                      ❌ ERROR
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={estilos.pie}>
        <p>
          Si <strong>ventasPOS</strong> y{" "}
          <strong>pedidosDelivery</strong> aparecen con fecha
          más antigua 20/09, todavía no significa que los
          pedidos anteriores hayan desaparecido.
        </p>

        <p>
          El siguiente paso será revisar si esos pedidos están
          guardados en <strong>subcolecciones</strong> o bajo
          otra estructura de Firestore.
        </p>
      </div>
    </main>
  );
}

// ============================================================
// ESTILOS
// ============================================================

const estilos = {
  contenedor: {
    minHeight: "100vh",
    background: "#f5f5f5",
    padding: "32px",
    color: "#222",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  cabecera: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
  },

  titulo: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "800",
  },

  subtitulo: {
    marginTop: "8px",
    color: "#666",
    fontSize: "15px",
  },

  boton: {
    border: "none",
    borderRadius: "10px",
    padding: "12px 18px",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "14px",
  },

  cargando: {
    background: "#fff",
    padding: "40px",
    borderRadius: "16px",
    textAlign: "center",
    maxWidth: "500px",
    margin: "80px auto",
  },

  tarjetaError: {
    background: "#fff",
    padding: "30px",
    borderRadius: "16px",
    maxWidth: "700px",
    margin: "50px auto",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },

  error: {
    color: "#dc2626",
    marginTop: "15px",
  },

  progreso: {
    background: "#fff",
    border: "1px solid #ddd",
    padding: "14px 18px",
    borderRadius: "10px",
    marginBottom: "20px",
    color: "#444",
    fontWeight: "600",
  },

  alerta: {
    background: "#fff3cd",
    border: "1px solid #ffe69c",
    color: "#664d03",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "20px",
  },

  resumen: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "15px",
    marginBottom: "20px",
  },

  cardResumen: {
    background: "#fff",
    borderRadius: "14px",
    padding: "20px",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  numero: {
    fontSize: "28px",
    fontWeight: "800",
  },

  label: {
    color: "#666",
    fontSize: "13px",
  },

  nota: {
    background: "#e8f4ff",
    border: "1px solid #b6dcff",
    borderRadius: "12px",
    padding: "15px 18px",
    marginBottom: "20px",
    color: "#17466b",
    lineHeight: "1.5",
  },

  tablaContenedor: {
    background: "#fff",
    borderRadius: "14px",
    overflowX: "auto",
    boxShadow:
      "0 3px 15px rgba(0,0,0,0.07)",
  },

  tabla: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1100px",
  },

  th: {
    textAlign: "left",
    padding: "15px",
    background: "#111",
    color: "#fff",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "14px 15px",
    borderBottom: "1px solid #eee",
    fontSize: "13px",
    verticalAlign: "top",
  },

  ok: {
    color: "#15803d",
    fontWeight: "700",
  },

  errorEstado: {
    color: "#dc2626",
    fontWeight: "700",
  },

  pie: {
    background: "#fff",
    borderRadius: "14px",
    padding: "20px",
    marginTop: "20px",
    lineHeight: "1.6",
    color: "#444",
  },
};