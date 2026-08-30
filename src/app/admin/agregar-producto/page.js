"use client";

import { useState } from "react";
import { db, storage } from "../../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useSucursal } from "../../context/SucursalContext";
import { useAuth } from "../../context/AuthContext";

const ADMIN_EMAIL = "alondra2017gaitan@gmail.com";

const AgregarProductoPage = () => {
  const { user } = useAuth();
  const { sucursal } = useSucursal();
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [categoria, setCategoria] = useState("");
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [preview, setPreview] = useState("");
  const [cargando, setCargando] = useState(false);

  if (!user) return null;

  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1B120D] p-6">
        <div className="bg-[#F8F5EF] rounded-3xl p-8 text-center max-w-md shadow-2xl">
          <h1 className="text-3xl font-black text-[#7A4E35] mb-4">
            Acceso denegado
          </h1>
          <p className="text-[#2B2B2B]">
            No tenés permisos para acceder al panel.
          </p>
        </div>
      </div>
    );
  }

  const seleccionarImagen = (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    setImagenArchivo(archivo);
    setPreview(URL.createObjectURL(archivo));
  };

  const agregarProducto = async (e) => {
    e.preventDefault();

    if (!sucursal) {
      alert("Primero elegí una sucursal.");
      return;
    }

    try {
      setCargando(true);

      let imagenUrl = "/logo.png";

      if (imagenArchivo) {
        const nombreImagen = `${Date.now()}-${imagenArchivo.name}`;
        const imagenRef = ref(
          storage,
          `productos/${sucursal.id}/${nombreImagen}`
        );

        await uploadBytes(imagenRef, imagenArchivo);
        imagenUrl = await getDownloadURL(imagenRef);
      }

      const productosRef = collection(
        db,
        "sucursales",
        sucursal.id,
        "productos"
      );

      await addDoc(productosRef, {
        Nombre: nombre,
        Descripcion: descripcion,
        precio: Number(precio),
        stock: Number(stock),
        categoria,
        imagen: imagenUrl,
      });

      router.push("/admin");
    } catch (error) {
      console.error("Error al agregar el producto:", error);
      alert("No se pudo agregar el producto.");
    } finally {
      setCargando(false);
    }
  };

  if (!sucursal) {
    return (
      <div className="min-h-screen bg-[#1B120D] text-white flex items-center justify-center p-6">
        <div className="bg-[#F8F5EF] text-[#2B2B2B] rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <h1 className="text-3xl font-black text-[#7A4E35] mb-4">
            Elegí una sucursal
          </h1>
          <p>Primero seleccioná una sucursal para cargar productos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1B120D] text-white relative overflow-hidden p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#7A4E35_0%,transparent_35%),radial-gradient(circle_at_bottom_right,#2F6B4F_0%,transparent_30%)] opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1B120D]/80 via-[#2A1A13]/90 to-[#120B08]" />

      <div className="relative z-10 max-w-2xl mx-auto bg-[#F8F5EF] text-[#2B2B2B] rounded-[2rem] p-8 shadow-2xl border border-[#E7C873]/40">
        <p className="text-[#2F6B4F] uppercase tracking-[0.3em] text-sm font-black mb-3">
          Nueva carga
        </p>

        <h1 className="text-4xl font-black text-[#7A4E35] mb-2">
          Agregar Producto
        </h1>

        <p className="mb-8 text-[#2B2B2B]/70 font-semibold">
          Se va a cargar en la sucursal:{" "}
          <span className="text-[#2F6B4F] font-black">{sucursal.nombre}</span>
        </p>

        <form onSubmit={agregarProducto} className="space-y-5">
          <div>
            <label className="block text-lg font-black mb-2">
              Nombre del producto
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full p-4 border border-[#7A4E35]/20 rounded-2xl bg-white focus:outline-none focus:border-[#2F6B4F]"
              required
            />
          </div>

          <div>
            <label className="block text-lg font-black mb-2">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full p-4 border border-[#7A4E35]/20 rounded-2xl bg-white focus:outline-none focus:border-[#2F6B4F]"
              required
            />
          </div>

          <div>
            <label className="block text-lg font-black mb-2">Precio</label>
            <input
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="w-full p-4 border border-[#7A4E35]/20 rounded-2xl bg-white focus:outline-none focus:border-[#2F6B4F]"
              required
            />
          </div>

          <div>
            <label className="block text-lg font-black mb-2">Stock</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full p-4 border border-[#7A4E35]/20 rounded-2xl bg-white focus:outline-none focus:border-[#2F6B4F]"
              required
            />
          </div>

          <div>
            <label className="block text-lg font-black mb-2">Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full p-4 border border-[#7A4E35]/20 rounded-2xl bg-white focus:outline-none focus:border-[#2F6B4F]"
              required
            >
              <option value="">Seleccionar categoría</option>
              <option value="pizzas">Pizzas</option>
              <option value="empanadas">Empanadas</option>
              <option value="hamburguesas">Hamburguesas</option>
              <option value="bebidas">Bebidas</option>
              <option value="promos">Promos</option>
            </select>
          </div>

          <div>
            <label className="block text-lg font-black mb-2">
              Imagen del producto
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={seleccionarImagen}
              className="w-full p-4 border border-[#7A4E35]/20 rounded-2xl bg-white"
            />

            {preview && (
              <img
                src={preview}
                alt="Vista previa"
                className="mt-4 w-full h-56 object-cover rounded-2xl border border-[#7A4E35]/20"
              />
            )}

            <p className="text-sm text-[#2B2B2B]/60 mt-2">
              Si no elegís imagen, se usa el logo por defecto.
            </p>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[#7A4E35] hover:bg-[#5F3825] text-white px-4 py-4 rounded-2xl font-black transition shadow-lg disabled:bg-gray-400"
          >
            {cargando ? "Guardando producto..." : "Agregar producto"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AgregarProductoPage;