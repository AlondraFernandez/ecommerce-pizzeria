"use client";

import { useCart } from "../context/CartContext";

const CarritoPage = () => {
  const { carrito, actualizarCantidad, eliminarProducto } = useCart();

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
                  {/* Botones de cantidad */}
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
                  {/* Botón de eliminar */}
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
          <div className="mt-4 text-right">
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600">
              Proceder al Pago
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarritoPage;










