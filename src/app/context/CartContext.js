"use client";

import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [carrito, setCarrito] = useState([]);

  useEffect(() => {
    const carritoGuardado = localStorage.getItem("carrito");
    if (carritoGuardado) {
      setCarrito(JSON.parse(carritoGuardado));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  const agregarAlCarrito = (producto) => {
    const cantidadAAgregar = producto.cantidad ?? 1;

    setCarrito((prevCarrito) => {
      const productoExistente = prevCarrito.find(
        (item) => item.id === producto.id && item.sucursalId === producto.sucursalId
      );

      if (productoExistente) {
        return prevCarrito.map((item) =>
          item.id === producto.id && item.sucursalId === producto.sucursalId
            ? { ...item, cantidad: item.cantidad + cantidadAAgregar }
            : item
        );
      }

      return [...prevCarrito, { ...producto, cantidad: cantidadAAgregar }];
    });
  };

  const actualizarCantidad = (id, cantidad) => {
    setCarrito((prevCarrito) =>
      prevCarrito.map((item) => {
        if (item.id !== id) return item;

        const categoria = item.categoria?.toLowerCase();

        return {
          ...item,
          cantidad:
            categoria === "pizzas"
              ? Math.max(cantidad, 0.5)
              : categoria === "empanadas"
              ? Math.max(cantidad, 3)
              : Math.max(cantidad, 1),
        };
      })
    );
  };

  const eliminarProducto = (id) => {
    setCarrito((prevCarrito) => prevCarrito.filter((item) => item.id !== id));
  };

  const vaciarCarrito = () => {
    setCarrito([]);
    localStorage.removeItem("carrito");
  };

  return (
    <CartContext.Provider
      value={{
        carrito,
        agregarAlCarrito,
        actualizarCantidad,
        eliminarProducto,
        vaciarCarrito,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  return useContext(CartContext);
};