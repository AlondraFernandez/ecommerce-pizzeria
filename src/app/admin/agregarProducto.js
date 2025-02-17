// src/app/admin/agregarProducto.js
import { useState } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const AgregarProductoPage = () => {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [categoria, setCategoria] = useState("");
  const router = useRouter();

  const agregarProducto = async (e) => {
    e.preventDefault();

    try {
      const productosRef = collection(db, "productos");
      await addDoc(productosRef, {
        Nombre: nombre,
        Descripcion: descripcion,
        precio: parseFloat(precio),
        stock: parseInt(stock),
        categoria: categoria,
      });
      router.push("/admin"); // Redirige a la página de administración
    } catch (error) {
      console.error("Error al agregar el producto:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Agregar Producto</h1>
      <form onSubmit={agregarProducto} className="space-y-6 max-w-lg mx-auto">
        {/* Formulario para agregar un producto */}
        <div>
          <label htmlFor="nombre" className="block text-lg font-medium mb-2">
            Nombre del Producto
          </label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full p-3 border rounded-md"
            required
          />
        </div>
        <div>
          <label htmlFor="descripcion" className="block text-lg font-medium mb-2">
            Descripción
          </label>
          <textarea
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full p-3 border rounded-md"
            required
          ></textarea>
        </div>
        <div>
          <label htmlFor="precio" className="block text-lg font-medium mb-2">
            Precio
          </label>
          <input
            id="precio"
            type="number"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            className="w-full p-3 border rounded-md"
            required
          />
        </div>
        <div>
          <label htmlFor="stock" className="block text-lg font-medium mb-2">
            Stock
          </label>
          <input
            id="stock"
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-full p-3 border rounded-md"
            required
          />
        </div>
        <div>
          <label htmlFor="categoria" className="block text-lg font-medium mb-2">
            Categoría
          </label>
          <input
            id="categoria"
            type="text"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full p-3 border rounded-md"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          Agregar Producto
        </button>
      </form>
    </div>
  );
};

export default AgregarProductoPage;
