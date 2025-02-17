// pages/login.js
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { useRouter } from "next/router";

const Login = () => {
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/productos"); // Redirigir a la página de productos tras iniciar sesión
    } catch (error) {
      console.error("Error de autenticación: ", error.message);
    }
  };

  return (
    <div>
      <h1>Iniciar sesión</h1>
      <button onClick={handleLogin}>Iniciar sesión con Google</button>
    </div>
  );
};

export default Login;
