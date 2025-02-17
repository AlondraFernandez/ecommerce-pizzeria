"use client"; // Asegura que se ejecute en el cliente

import { useCart } from "../context/CartContext"; // Importamos el hook del carrito

const Header = () => {
  const { carrito } = useCart(); // Obtenemos el carrito desde el contexto

return (
    <header className="bg-gray-800 text-white p-4 flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Pizzería del Sabor</h1>
        <nav>
            <ul className="flex flex-col md:flex-row gap-4">
                <li><a href="/">Inicio</a></li>
                <li><a href="/productos">Productos</a></li>
                <li><a href="/contacto">Contacto</a></li>
                <li><a href="/admin">Admin</a></li>
                <li>
                    <a href="/carrito">
                        Carrito 🛒
                        {carrito.length > 0 && (
                            <span className="bg-red-500 text-white px-2 py-1 rounded-full ml-2">
                                {carrito.length}
                            </span>
                        )}
                    </a>
                </li>
            </ul>
        </nav>
    </header>
);
};

export default Header;
