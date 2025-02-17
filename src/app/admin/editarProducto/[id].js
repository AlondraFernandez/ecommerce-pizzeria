// src/app/admin/editarProducto/[id].js
"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

const EditarProductoPage = ({ params }) => {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/login"); // Redirige a login si no hay usuario autenticado
    }
  }, [user, router]);

  const [producto, setProducto] = useState(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [categoria, setCategoria] = useState("");

  useEffect(() => {
    const obtenerProducto = async () => {
      const productoRef = doc(db, "productos", params.id);
      const productoSnapshot = await getDoc(productoRef);
      if (productoSnapshot.exists()) {
        const data = productoSnapshot.data();
        setProducto(data);
        setNombre(data.Nombre);
        setDescripcion(data.Descripcion);
        setPrecio(data.precio);
        setStock(data.stock);
        setCategoria(data.categoria);
      }
    };

    obtenerProducto();
  }, [params.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const productoRef = doc(db, "productos", params.id);
      await updateDoc(productoRef, {
        Nombre: nombre,
        Descripcion: descripcion,
        precio: parseFloat(precio),
        stock: parseInt(stock),
        categoria: categoria,
      });
      router.push("/admin");
    } catch (error) {
      console.error("Error al editar producto:", error);
    }
  };

  if (!producto) return <p>Cargando...</p>;

  return (
    <div>
      {/* Formulario de edición de producto */}
    </div>
  );
};

export default EditarProductoPage;

