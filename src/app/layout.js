// src/app/layout.js
import "./globals.css"; 
import { CartProvider } from "./context/CartContext"; // Importamos el contexto de carrito
import { AuthProvider } from "./context/AuthContext"; // Asegúrate de importar el AuthProvider correctamente
import Header from "./components/Header"; // Importamos el Header

export const metadata = {
  title: "Pizzería",
  description: "Bienvenido a nuestra pizzería",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider> {/* El AuthProvider debe envolver toda la app */}
          <CartProvider> {/* Asegúrate de que el CartProvider esté dentro del AuthProvider */}
            <Header /> 
            <main>{children}</main>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}


