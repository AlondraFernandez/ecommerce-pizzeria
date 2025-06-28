"use client";
import { useState } from "react";
import { useCart } from "../context/CartContext";

const CantidadModal = ({ producto, cerrar }) => {
  const { agregarAlCarrito } = useCart();

  const esPizza = producto.categoria?.toLowerCase() === "pizzas";
  const esEmpanada = producto.categoria?.toLowerCase() === "empanadas";

  const [cantidad, setCantidad] = useState(() => {
    if (esPizza) return 0.5;
    if (esEmpanada) return 3;
    return 1;
  });

  const aumentar = () => {
    setCantidad(prev => esPizza
      ? Math.round((prev + 0.5) * 10) / 10
      : prev + 1
    );
  };

  const disminuir = () => {
    setCantidad(prev => {
      if (esPizza) return Math.max(Math.round((prev - 0.5) * 10) / 10, 0.5);
      if (esEmpanada) return Math.max(prev - 1, 3);
      return Math.max(prev - 1, 1);
    });
  };

  const confirmar = () => {
    agregarAlCarrito({ ...producto, cantidad });
    cerrar();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80 text-center">
        <h2 className="text-xl font-bold mb-4">¿Cuántas unidades de {producto.Nombre}?</h2>
        <div className="flex justify-center items-center gap-4 mb-4">
          <button 
            onClick={disminuir} 
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            ➖
          </button>
          <span className="text-lg font-bold">
            {esPizza ? cantidad.toFixed(1) : cantidad}
          </span>
          <button 
            onClick={aumentar} 
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            ➕
          </button>
        </div>
        <div className="flex justify-between gap-4">
          <button 
            onClick={confirmar} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Confirmar
          </button>
          <button 
            onClick={cerrar} 
            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CantidadModal;
