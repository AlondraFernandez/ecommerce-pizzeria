"use client";

import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [carrito, setCarrito] = useState([]);

  // Cargar carrito desde localStorage al inicio
  useEffect(() => {
    const carritoGuardado = localStorage.getItem("carrito");
    if (carritoGuardado) {
      setCarrito(JSON.parse(carritoGuardado));
    }
  }, []);

  // Guardar el carrito en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  const agregarAlCarrito = (producto) => {
    setCarrito((prevCarrito) => {
      const productoExistente = prevCarrito.find(item => item.id === producto.id);
      if (productoExistente) {
        return prevCarrito.map(item =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      } else {
        return [...prevCarrito, { ...producto, cantidad: 1 }];
      }
    });
  };

  const actualizarCantidad = (id, cantidad) => {
    setCarrito((prevCarrito) => 
      prevCarrito.map(item =>
        item.id === id
          ? { 
              ...item, 
              cantidad: item.categoria === "pizzas" 
              ? Math.max(cantidad, 0.5) 
              : item.categoria === "empanadas" 
                ? Math.max(cantidad, 3) 
                : Math.max(cantidad, 1)
            }
          : item
      )
    );
  };
  

  const eliminarProducto = (id) => {
    setCarrito((prevCarrito) => 
      prevCarrito.filter(item => item.id !== id)
    );
  };

  return (
    <CartContext.Provider value={{ carrito, agregarAlCarrito, actualizarCantidad, eliminarProducto }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  return useContext(CartContext);
};
