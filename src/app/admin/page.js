"use client"
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

const AdminPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  useEffect(() => {
    const fetchProductos = async () => {
      const productosRef = collection(db, "productos");
      const snapshot = await getDocs(productosRef);
      const productosList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProductos(productosList);
    };

    fetchProductos();
  }, []);

  if (!user) return <p>Cargando...</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Panel de Administración</h1>
      <p>Bienvenido, {user.displayName || "usuario"}.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Productos</h2>
          <p>Administra los productos disponibles en la tienda.</p>

          <ul className="mt-4">
            {productos.length > 0 ? (
              productos.map((producto) => (
                <li key={producto.id} className="mb-2">
                  <Link href={`/admin/editarProducto/${producto.id}`} className="text-blue-500 hover:underline">
                    Editar {producto.Nombre}
                  </Link>
                </li>
              ))
            ) : (
              <p>No hay productos disponibles.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
