"use client";

import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs,doc,updateDoc } from "firebase/firestore";
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
  const categoria = producto.categoria?.toLowerCase();

  if (actual === undefined) actual = categoria === "pizzas" ? 0.5 : 1;

  let nuevaCantidad = actual;

  if (categoria === "pizzas") {
    nuevaCantidad = operacion === "sumar" ? actual + 0.5 : actual - 0.5;
    if (nuevaCantidad < 0.5) nuevaCantidad = 0.5;
  } else {
    const minimo = categoria === "empanadas" ? 3 : 1;
    nuevaCantidad = operacion === "sumar" ? actual + 1 : actual - 1;
    if (nuevaCantidad < minimo) nuevaCantidad = minimo;
  }

  if (nuevaCantidad > producto.stock) nuevaCantidad = producto.stock;

  setCantidadSeleccionada((prev) => ({
    ...prev,
    [producto.id]: Math.round(nuevaCantidad * 10) / 10,
  }));
};



  const confirmarAgregar = async (producto) => {
  const cantidad = cantidadSeleccionada[producto.id] || 1;

  if (producto.stock < cantidad) {
    Swal.fire({
      icon: "error",
      title: "Stock insuficiente",
      text: `Solo hay ${producto.stock} unidades disponibles.`,
    });
    return;
  }

  // Agregar al carrito UNA sola vez con la cantidad seleccionada
  agregarAlCarrito({ ...producto, cantidad });

  // Restar del stock en Firebase
  const nuevoStock = producto.stock - cantidad;
  const productoRef = doc(db, "productos", producto.id);
  await updateDoc(productoRef, { stock: nuevoStock });

  // Actualizar productos en estado
  setProductos((prev) =>
    prev.map((p) => (p.id === producto.id ? { ...p, stock: nuevoStock } : p))
  );

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
    disabled={producto.stock <= 0}
    className={`mt-4 w-full px-4 py-2 rounded-lg transition duration-300
      ${producto.stock <= 0 
        ? "bg-gray-500 cursor-not-allowed text-white"
        : "bg-red-600 hover:bg-red-500 text-white"}`}
  >
    {producto.stock <= 0 ? "Sin stock" : "Agregar al carrito"}
  </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ProductosPage;
