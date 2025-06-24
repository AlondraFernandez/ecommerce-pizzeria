"use client";

import { useCart } from "../context/CartContext";
import { useState } from "react";
import Swal from "sweetalert2";

const CarritoPage = () => {
  const { carrito, actualizarCantidad, eliminarProducto } = useCart();
  const [metodoEntrega, setMetodoEntrega] = useState("local");
  const [direccion, setDireccion] = useState("");
  const [nombre, setNombre] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");

  const precioDelivery = 800;

  const total = carrito.reduce((acc, producto) => {
    const cantidad = parseFloat(producto.cantidad) || 0;
    return acc + producto.precio * cantidad;
  }, 0);

  const totalConDelivery = metodoEntrega === "delivery" ? total + precioDelivery : total;

  const handleEnviarPedido = () => {
    if (metodoEntrega === "delivery" && direccion.trim() === "") {
      Swal.fire({
        icon: "error",
        title: "Dirección requerida",
        text: "Por favor, ingresa una dirección para el envío.",
      });
      return;
    }

    if (metodoEntrega === "local" && nombre.trim() === "") {
      Swal.fire({
        icon: "error",
        title: "Nombre requerido",
        text: "Por favor, ingresa tu nombre para el retiro en el local.",
      });
      return;
    }

    const detalles = carrito.map((item) => {
      const cantidad = parseFloat(item.cantidad) || 0;
      const subtotal = cantidad * item.precio;
      return `${item.Nombre} x ${cantidad} = $${subtotal}`;
    }).join("\n");

    const mensaje = `Hola! Quiero hacer un pedido:\n\n${detalles}\n\nTotal: $${totalConDelivery}${
      metodoEntrega === "delivery" ? ` (incluye $${precioDelivery} de delivery)` : ""
    }\nMétodo de entrega: ${
      metodoEntrega === "delivery" ? `Delivery a ${direccion}` : `Retiro en local - Nombre: ${nombre}`
    }\nMétodo de pago: ${
      metodoPago === "efectivo" ? "Efectivo" : "Transferencia - Alias: pizzeria.eljope"
    }`;

    const url = `https://wa.me/5492302344813?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-gray-800 text-white p-6">
      <h1 className="text-4xl font-bold mb-6 text-center text-yellow-400">Tu Carrito 🛒</h1>

      {carrito.length === 0 ? (
        <p className="text-center text-gray-400">El carrito está vacío.</p>
      ) : (
        <div className="space-y-6">
          {carrito.map((producto) => {
            const cantidad = parseFloat(producto.cantidad) || 0;
            const paso = producto.categoria === "pizzas" ? 0.5 : 1;
            const minimo = producto.categoria === "pizzas" ? 0.5 : 1;
            return (
              <div key={producto.id} className="bg-red-900 rounded-lg p-4 shadow-md">
                <h2 className="text-2xl font-bold text-yellow-300">{producto.Nombre}</h2>
                <p className="text-white">${producto.precio} x {cantidad}</p>
                <div className="flex items-center gap-4 mt-2">
                  <button
                    onClick={() => actualizarCantidad(producto.id, Math.max(cantidad - paso, minimo))}
                    className="bg-yellow-400 text-black px-3 py-1 rounded font-bold hover:bg-yellow-300"
                  >
                    ➖
                  </button>
                  <span className="text-lg font-semibold text-white">{cantidad}</span>
                  <button
                    onClick={() => actualizarCantidad(producto.id, cantidad + paso)}
                    className="bg-yellow-400 text-black px-3 py-1 rounded font-bold hover:bg-yellow-300"
                  >
                    ➕
                  </button>
                  <button
                    onClick={() => eliminarProducto(producto.id)}
                    className="ml-auto bg-black text-white border border-yellow-400 px-3 py-1 rounded hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}

          <div className="bg-gray-800 p-4 rounded shadow">
            <h3 className="text-xl text-yellow-400 font-bold mb-2">Método de Entrega</h3>
            <div className="space-x-4 text-white">
              <label>
                <input
                  type="radio"
                  value="local"
                  checked={metodoEntrega === "local"}
                  onChange={(e) => setMetodoEntrega(e.target.value)}
                /> Retiro en el local
              </label>
              <label>
                <input
                  type="radio"
                  value="delivery"
                  checked={metodoEntrega === "delivery"}
                  onChange={(e) => setMetodoEntrega(e.target.value)}
                /> Delivery (+$800)
              </label>
            </div>

            {metodoEntrega === "delivery" ? (
              <input
                type="text"
                placeholder="Dirección de entrega"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="mt-3 w-full p-2 rounded bg-black text-white border border-yellow-500"
              />
            ) : (
              <input
                type="text"
                placeholder="Nombre para retiro"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-3 w-full p-2 rounded bg-black text-white border border-yellow-500"
              />
            )}
          </div>

          <div className="bg-gray-800 p-4 rounded shadow mt-4">
            <h3 className="text-xl text-yellow-400 font-bold mb-2">Método de Pago</h3>
            <div className="space-x-4 text-white">
              <label>
                <input
                  type="radio"
                  value="efectivo"
                  checked={metodoPago === "efectivo"}
                  onChange={(e) => setMetodoPago(e.target.value)}
                /> Efectivo
              </label>
              <label>
                <input
                  type="radio"
                  value="transferencia"
                  checked={metodoPago === "transferencia"}
                  onChange={(e) => setMetodoPago(e.target.value)}
                /> Transferencia
              </label>
            </div>
            {metodoPago === "transferencia" && (
              <p className="mt-2 text-sm text-yellow-300">Alias: pizzeria.eljope
              POR FAVOR ENVIE SU COMPROBANTE,GRACIAS</p>
            )}
          </div>

          <div className="text-right mt-6">
            <p className="text-2xl text-yellow-400 font-bold mb-4">Total: ${totalConDelivery}</p>
            <button
              onClick={handleEnviarPedido}
              className="bg-yellow-400 text-black font-bold px-6 py-3 rounded-lg hover:bg-yellow-300 transition"
            >
              Enviar pedido por WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarritoPage;

