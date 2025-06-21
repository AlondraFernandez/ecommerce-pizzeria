"use client";

import { useState } from "react";
import { useCart } from "../context/CartContext";
import Swal from "sweetalert2";

const CarritoPage = () => {
  const { carrito, actualizarCantidad, eliminarProducto } = useCart();
  const [metodoEntrega, setMetodoEntrega] = useState("retiro"); // Default: Retiro en local
  const [direccion, setDireccion] = useState("");
  const [nombre, setNombre] = useState("");

  const total = carrito.reduce((acc, producto) => acc + producto.precio * producto.cantidad, 0);
  const costoDelivery = metodoEntrega === "delivery" ? 800 : 0; // Costo extra si es delivery

  const enviarPedido = () => {
    if (metodoEntrega === "delivery" && !direccion.trim()) {
      Swal.fire("Error", "Por favor, ingresa una dirección para el delivery", "error");
      return;
    }
    if (metodoEntrega === "retiro" && !nombre.trim()) {
      Swal.fire("Error", "Por favor, ingresa tu nombre para el retiro", "error");
      return;
    }

    let mensaje = `Hola, quiero hacer un pedido:\n`;
    carrito.forEach((producto) => {
      mensaje += `- ${producto.Nombre} x${producto.cantidad} - $${producto.precio * producto.cantidad}\n`;
    });
    mensaje += `Total: $${total + costoDelivery}\n`;
    mensaje += metodoEntrega === "delivery" ? `Dirección: ${direccion}\n` : `Nombre: ${nombre}\n`;
    mensaje += `Método de entrega: ${metodoEntrega === "delivery" ? "Delivery" : "Retiro en local"}`;
    
    // Aquí actualizamos el número de teléfono de WhatsApp
    const url = `https://wa.me/542302344813?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white py-8 px-4">
      <h1 className="text-4xl font-extrabold text-center text-red-600 mb-6">Tu Carrito</h1>
      {carrito.length === 0 ? (
        <p className="text-center text-gray-400">No hay productos en el carrito.</p>
      ) : (
        <div className="bg-white text-gray-800 shadow-lg rounded-lg p-6 max-w-4xl mx-auto">
          <ul className="divide-y divide-gray-200">
            {carrito.map((producto) => (
              <li key={producto.id} className="py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">{producto.Nombre}</h2>
                  <p className="text-gray-500">${producto.precio} x {producto.cantidad}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => actualizarCantidad(producto.id, producto.cantidad - 1)} 
                    disabled={producto.cantidad <= 1}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 transition"
                  >
                    ➖
                  </button>
                  <button 
                    onClick={() => actualizarCantidad(producto.id, producto.cantidad + 1)} 
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
                  >
                    ➕
                  </button>
                  <button 
                    onClick={() => eliminarProducto(producto.id)} 
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition"
                  >
                    Eliminar
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">${producto.precio * producto.cantidad}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-3">Método de Entrega</h2>
            <select
              className="w-full p-4 border border-gray-300 rounded-md bg-gray-100 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={metodoEntrega}
              onChange={(e) => setMetodoEntrega(e.target.value)}
            >
              <option value="retiro">Retiro en local</option>
              <option value="delivery">Delivery (+$800)</option>
            </select>
          </div>

          {metodoEntrega === "delivery" ? (
            <input
              type="text"
              placeholder="Ingresa tu dirección"
              className="w-full p-4 mt-4 border border-gray-300 rounded-md bg-gray-100 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          ) : (
            <input
              type="text"
              placeholder="Ingresa tu nombre"
              className="w-full p-4 mt-4 border border-gray-300 rounded-md bg-gray-100 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          )}

          <div className="mt-6 flex justify-between items-center">
            <p className="text-lg font-semibold text-gray-800">Total: ${total + costoDelivery}</p>
            <button 
              onClick={enviarPedido} 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transition"
            >
              Enviar Pedido por WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarritoPage;
