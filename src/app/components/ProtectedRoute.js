import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/router";

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login"); // Redirigir a la página de login si no está autenticado
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [router]);

  if (loading) return <p>Cargando...</p>;

  return <>{children}</>;
};

export default ProtectedRoute;

