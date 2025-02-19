"use client";

import { useEffect, useState } from "react";
import { db } from "../../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";

const EditarProductoPage = ({ params }) => {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = params; // Obtiene el ID de la URL

  const [producto, setProducto] = useState(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [categoria, setCategoria] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  useEffect(() => {
    const obtenerProducto = async () => {
      if (!id) return;
      const productoRef = doc(db, "productos", id);
      const productoSnapshot = await getDoc(productoRef);
      if (productoSnapshot.exists()) {
        const data = productoSnapshot.data();
        setProducto(data);
        setNombre(data.Nombre);
        setDescripcion(data.Descripcion);
        setPrecio(data.precio);
        setStock(data.stock);
        setCategoria(data.categoria);
      }
    };

    obtenerProducto();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const productoRef = doc(db, "productos", id);
      await updateDoc(productoRef, {
        Nombre: nombre,
        Descripcion: descripcion,
        precio: parseFloat(precio),
        stock: parseInt(stock),
        categoria: categoria,
      });
      router.push("/admin");
    } catch (error) {
      console.error("Error al editar producto:", error);
    }
  };

  if (!producto) return <p>Cargando...</p>;

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Editar Producto</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <label className="block mb-2">Nombre</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="border p-2 w-full"
        />

        <label className="block mb-2 mt-4">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="border p-2 w-full"
        />

        <label className="block mb-2 mt-4">Precio</label>
        <input
          type="number"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          className="border p-2 w-full"
        />

        <label className="block mb-2 mt-4">Stock</label>
        <input
          type="number"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="border p-2 w-full"
        />

        <label className="block mb-2 mt-4">Categoría</label>
        <input
          type="text"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="border p-2 w-full"
        />

        <button type="submit" className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
          Guardar cambios
        </button>
      </form>
    </div>
  );
};

export default EditarProductoPage;
