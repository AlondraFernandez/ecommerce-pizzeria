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
    <header className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-600 text-white p-6 shadow-xl sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-extrabold drop-shadow-lg"
        >
          Pizzería Jope
        </motion.h1>
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16m-7 6h7"
            />
          </svg>
        </button>
        <nav
          className={`${
            menuOpen ? "block" : "hidden"
          } absolute md:relative top-16 md:top-0 left-0 w-full md:w-auto bg-blue-700 md:bg-transparent p-4 md:p-0 transition-all duration-300 md:flex rounded-lg shadow-lg md:shadow-none`}
        >
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row gap-6 text-lg md:text-base"
          >
            <li className="hover:text-yellow-300 transition duration-300">
              <Link href="/" onClick={handleLinkClick}>Inicio</Link>
            </li>
            <li className="hover:text-yellow-300 transition duration-300">
              <Link href="/productos" onClick={handleLinkClick}>Productos</Link>
            </li>
            <li className="hover:text-yellow-300 transition duration-300">
              <Link href="/contacto" onClick={handleLinkClick}>Contacto</Link>
            </li>
            <li className="hover:text-yellow-300 transition duration-300">
              <Link href="/admin" onClick={handleLinkClick}>Admin</Link>
            </li>
            <li className="relative hover:text-yellow-300 transition duration-300">
              <Link href="/carrito" onClick={handleLinkClick}>
                Carrito 🛒
                {carrito.length > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white text-red-600 px-2 py-1 rounded-full ml-2 text-sm font-bold shadow-md"
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
