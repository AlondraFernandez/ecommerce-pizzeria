// components/LogoutButton.js
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

const LogoutButton = () => {
  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        // Redirigir a la página de login
        window.location.href = "/login";
      })
      .catch((error) => {
        console.error("Error al cerrar sesión: ", error);
      });
  };

  return <button onClick={handleLogout}>Cerrar sesión</button>;
};

export default LogoutButton;
