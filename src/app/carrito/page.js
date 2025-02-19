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
  const costoDelivery = metodoEntrega === "delivery" ? 500 : 0; // Costo extra si es delivery

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
    
    const url = `https://wa.me/1234567890?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="container mx-auto p-4 bg-gray-100">
      <h1 className="text-3xl font-bold mb-4 text-blue-700">Tu Carrito</h1>
      {carrito.length === 0 ? (
        <p className="text-gray-500">No hay productos en el carrito.</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-4">
          <ul className="divide-y divide-gray-200">
            {carrito.map((producto) => (
              <li key={producto.id} className="py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">{producto.Nombre}</h2>
                  <p className="text-gray-500">${producto.precio} x {producto.cantidad}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => actualizarCantidad(producto.id, producto.cantidad - 1)} 
                    disabled={producto.cantidad <= 1}
                    className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 disabled:opacity-50"
                  >
                    ➖
                  </button>
                  <button 
                    onClick={() => actualizarCantidad(producto.id, producto.cantidad + 1)} 
                    className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
                  >
                    ➕
                  </button>
                  <button 
                    onClick={() => eliminarProducto(producto.id)} 
                    className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600"
                  >
                    Eliminar
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-800">${producto.precio * producto.cantidad}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <h2 className="text-xl font-bold">Método de Entrega</h2>
            <select
              className="w-full p-2 border rounded mt-2"
              value={metodoEntrega}
              onChange={(e) => setMetodoEntrega(e.target.value)}
            >
              <option value="retiro">Retiro en local</option>
              <option value="delivery">Delivery (+$500)</option>
            </select>
          </div>

          {metodoEntrega === "delivery" ? (
            <input
              type="text"
              placeholder="Ingresa tu dirección"
              className="w-full p-2 border rounded mt-2"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          ) : (
            <input
              type="text"
              placeholder="Ingresa tu nombre"
              className="w-full p-2 border rounded mt-2"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          )}

          <div className="mt-4 text-right">
            <button 
              onClick={enviarPedido} 
              className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600"
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











