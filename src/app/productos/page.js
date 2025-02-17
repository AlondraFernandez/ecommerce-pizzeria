// src/app/productos/page.js
"use client";
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useCart } from "../context/CartContext"; // Importamos el contexto

const ProductosPage = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const { agregarAlCarrito } = useCart(); // Usamos la función para agregar al carrito
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");

  useEffect(() => {
    const obtenerProductos = async () => {
      const productosRef = collection(db, "productos");
      const productosSnapshot = await getDocs(productosRef);
      const listaProductos = productosSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProductos(listaProductos);

      // Obtener categorías únicas
      const categoriasUnicas = [
        ...new Set(listaProductos.map((producto) => producto.categoria)),
      ];
      setCategorias(categoriasUnicas);
    };

    obtenerProductos();
  }, []);

  const productosFiltrados = categoriaSeleccionada
    ? productos.filter((producto) => producto.categoria === categoriaSeleccionada)
    : productos;

  return (
    <div className="min-h-screen bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 p-8">
      <h1 className="text-4xl font-extrabold text-center text-white mb-8">Nuestros Productos</h1>

      {/* Filtro de categorías */}
      <select
        className="mb-8 p-2 rounded-md"
        value={categoriaSeleccionada}
        onChange={(e) => setCategoriaSeleccionada(e.target.value)}
      >
        <option value="">Selecciona una categoría</option>
        {categorias.map((categoria) => (
          <option key={categoria} value={categoria}>
            {categoria}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {productosFiltrados.map((producto) => (
          <div key={producto.id} className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{producto.Nombre}</h2>
            <p className="text-gray-700 mb-4">{producto.Descripcion}</p>
            <p className="text-lg font-semibold text-gray-900 mb-2">${producto.precio}</p>
            <p className="text-sm text-gray-600 mb-4">Stock: {producto.stock}</p>
            <button
              onClick={() => {
                agregarAlCarrito(producto); // Agrega al carrito
                console.log("Producto agregado al carrito:", producto);
              }}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500 transition-colors duration-300"
            >
              Agregar al carrito
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductosPage;
