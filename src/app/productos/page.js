"use client";

import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useCart } from "../context/CartContext";
import Image from "next/image";
import Swal from "sweetalert2";
import { motion } from "framer-motion";

const ProductosPage = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const { agregarAlCarrito } = useCart();
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
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-gray-800 p-8 text-white">
      <h1 className="text-5xl font-extrabold text-center mb-8 tracking-wide text-red-500">
        Nuestro Menú 🍕
      </h1>

      <div className="flex justify-center mb-8">
        <select
          className="p-3 bg-gray-700 text-white rounded-lg shadow-md border border-gray-600 focus:outline-none"
          value={categoriaSeleccionada}
          onChange={(e) => setCategoriaSeleccionada(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((categoria, index) => (
            <option key={index} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {productosFiltrados.map((producto) => (
          <motion.div
            key={producto.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900 p-6 rounded-lg shadow-lg hover:scale-105 transition-transform duration-300"
          >
            <h2 className="text-2xl font-bold text-red-400 mb-2 text-center">{producto.Nombre}</h2>
            <div className="w-full h-48 relative overflow-hidden rounded-md">
              <Image
                src={producto.imagen}
                alt={producto.Nombre}
                layout="fill"
                objectFit="cover"
                className="rounded-md hover:scale-110 transition-transform duration-300"
              />
            </div>
            <p className="text-gray-300 mt-4 text-center">{producto.Descripcion}</p>
            <p className="text-lg font-semibold text-red-400 mt-2 text-center">${producto.precio}</p>
            <p className="text-sm text-gray-400 text-center">Stock: {producto.stock}</p>
            <button
              onClick={() => {
                agregarAlCarrito(producto);
                Swal.fire({
                  icon: "success",
                  title: "Agregado al carrito",
                  text: `${producto.Nombre} ha sido agregado al carrito.`,
                  showConfirmButton: false,
                  timer: 1500,
                });
              }}
              className="mt-4 w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition duration-300"
            >
              Agregar al carrito
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ProductosPage;

