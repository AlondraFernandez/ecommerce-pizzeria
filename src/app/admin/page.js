// src/app/admin/page.js
"use client";

import { useEffect } from "react";
import { useAuth } from "../../app/context/AuthContext"; // Asegúrate de importar el hook useAuth correctamente
import { useRouter } from "next/navigation";

const AdminPage = () => {
  const { user } = useAuth(); // Accede al usuario desde el contexto de autenticación
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      // Si no hay un usuario, redirige al login
      router.push("/login"); // Redirige a la página de login si no hay usuario autenticado
    }
  }, [user, router]);

  if (!user) return <p>Cargando...</p>; // Muestra un mensaje mientras carga el usuario

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Panel de Administración</h1>
      {/* Aquí puedes agregar el contenido de la página del admin */}
      <p>Bienvenido, {user.displayName || "usuario"}.</p>
      {/* Agrega otros componentes de administración aquí */}
    </div>
  );
};

export default AdminPage;

