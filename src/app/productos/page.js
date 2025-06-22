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
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const { agregarAlCarrito } = useCart();
  const [contadorActivo, setContadorActivo] = useState(null);
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState({});

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

  const abrirContador = (producto) => {
    setContadorActivo(producto.id);
    const minimo = producto.categoria === "pizzas" ? 0.5 : 1;
    setCantidadSeleccionada((prev) => ({
      ...prev,
      [producto.id]: minimo,
    }));
  };

  const cambiarCantidad = (producto, operacion) => {
    let actual = cantidadSeleccionada[producto.id];
    if (actual === undefined) actual = producto.categoria === "pizzas" ? 0.5 : 1;

    let nuevaCantidad = actual;
    if (producto.categoria === "pizzas") {
      if (actual === 0.5 && operacion === "sumar") {
        nuevaCantidad = 1.5;
      } else {
        nuevaCantidad = operacion === "sumar" ? actual + 1 : actual - 1;
      }
      if (nuevaCantidad < 0.5) nuevaCantidad = 0.5;
    } else {
      const minimo = producto.categoria === "empanadas" ? 3 : 1;
      nuevaCantidad = operacion === "sumar" ? actual + 1 : actual - 1;
      if (nuevaCantidad < minimo) nuevaCantidad = minimo;
    }

    setCantidadSeleccionada((prev) => ({
      ...prev,
      [producto.id]: nuevaCantidad,
    }));
  };

  const confirmarAgregar = (producto) => {
    const cantidad = cantidadSeleccionada[producto.id] || 1;
    for (let i = 0; i < cantidad; i++) {
      agregarAlCarrito(producto);
    }
    Swal.fire({
      icon: "success",
      title: "Agregado al carrito",
      text: `${producto.Nombre} x ${cantidad} agregado.`,
      showConfirmButton: false,
      timer: 1500,
    });
    setContadorActivo(null);
  };

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
            className="bg-gray-900 p-6 rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 relative"
          >
            <h2 className="text-2xl font-bold text-red-400 mb-2 text-center">
              {producto.Nombre}
            </h2>
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

            {contadorActivo === producto.id ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 flex flex-col items-center gap-2 bg-gray-800 p-5 rounded-xl shadow-xl border border-yellow-500"
              >
                <p className="text-sm text-gray-300 mb-1">Seleccioná la cantidad:</p>
                <div className="flex items-center gap-6">
                  <button
                    className="bg-red-600 text-white px-4 py-2 rounded-full text-xl hover:bg-red-700"
                    onClick={() => cambiarCantidad(producto, "restar")}
                  >
                    ➖
                  </button>
                  <div className="text-center">
                    <span className="text-2xl font-bold block">
                      {cantidadSeleccionada[producto.id] ??
                        (producto.categoria === "pizzas" ? 0.5 : 1)}
                    </span>
                    <span className="text-sm text-gray-400">
                      Total: $
                      {(
                        producto.precio *
                        (cantidadSeleccionada[producto.id] ??
                          (producto.categoria === "pizzas" ? 0.5 : 1))
                      ).toFixed(2)}
                    </span>
                  </div>
                  <button
                    className="bg-green-600 text-white px-4 py-2 rounded-full text-xl hover:bg-green-700"
                    onClick={() => cambiarCantidad(producto, "sumar")}
                  >
                    ➕
                  </button>
                </div>
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => confirmarAgregar(producto)}
                    className="bg-yellow-500 px-6 py-2 rounded-full hover:bg-yellow-400 text-black font-semibold"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setContadorActivo(null)}
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => abrirContador(producto)}
                className="mt-4 w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition duration-300"
              >
                Agregar al carrito
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ProductosPage;
