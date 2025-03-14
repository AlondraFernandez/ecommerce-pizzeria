"use client";

import { useCart } from "../context/CartContext";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

const Header = () => {
  const { carrito } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  return (
    <header className="bg-gradient-to-r from-black to-gray-800 bg-opacity-90 backdrop-blur-md text-white p-6 sticky top-0 z-50 shadow-2xl">
      <div className="container mx-auto flex justify-between items-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-bold text-red-500 tracking-wider cursor-pointer hover:scale-105 transition duration-300"
        >
          Pizzería Jope
        </motion.h1>

        {/* Botón de menú móvil */}
        <button
          className="md:hidden text-white focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="w-8 h-8"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>

        {/* Menú de navegación */}
        <nav
          className={`${
            menuOpen ? "block" : "hidden"
          } absolute md:relative top-16 md:top-0 left-0 w-full md:w-auto bg-black md:bg-transparent p-5 md:p-0 transition-all duration-300 md:flex rounded-lg shadow-lg md:shadow-none`}
        >
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row gap-6 text-lg md:text-base font-medium"
          >
            {[{ name: "Inicio", href: "/" }, { name: "Productos", href: "/productos" }, { name: "Admin", href: "/login" }].map((item, index) => (
              <li
                key={index}
                className="relative hover:text-red-500 transition duration-300 hover:scale-105"
              >
                <Link href={item.href} onClick={handleLinkClick}>{item.name}</Link>
              </li>
            ))}

            {/* Carrito de compras */}
            <li className="relative hover:text-red-500 transition duration-300 hover:scale-105">
              <Link href="/carrito" onClick={handleLinkClick}>
                Carrito 🛒
                {carrito.length > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="bg-red-500 text-white px-2 py-1 rounded-full ml-2 text-sm font-bold shadow-md"
                  >
                    {carrito.length}
                  </motion.span>
                )}
              </Link>
            </li>
          </motion.ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
