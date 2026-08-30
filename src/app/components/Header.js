"use client";

import { useCart } from "../context/CartContext";
import { useSucursal } from "../context/SucursalContext";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

const Header = () => {
  const { carrito } = useCart();
  const { sucursal, cambiarSucursal } = useSucursal();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl text-[#2B2B2B] border-b border-[#7A4E35]/10 shadow-lg">
      <div className="container mx-auto flex justify-between items-center px-5 py-4">
        <Link href="/" onClick={handleLinkClick}>
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="cursor-pointer"
          >
            <h1 className="text-2xl md:text-4xl font-black tracking-wide text-[#2B2B2B]">
              Pizzería <span className="text-[#7A4E35]">Jope</span>
            </h1>

            <p className="text-xs md:text-sm text-[#2F6B4F] tracking-[0.25em] uppercase font-bold">
              artesanal
            </p>
          </motion.div>
        </Link>

        <button
          className="md:hidden text-[#7A4E35] focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <span className="text-3xl">✕</span>
          ) : (
            <span className="text-3xl">☰</span>
          )}
        </button>

        <nav
          className={`${
            menuOpen ? "block" : "hidden"
          } absolute md:relative top-[76px] md:top-0 left-0 w-full md:w-auto bg-white md:bg-transparent p-5 md:p-0 transition-all duration-300 md:flex rounded-b-2xl md:rounded-none shadow-xl md:shadow-none border-b md:border-none border-[#7A4E35]/10`}
        >
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row md:items-center gap-5 text-base font-bold"
          >
            {[
              { name: "Inicio", href: "/" },
              { name: "Menú", href: "/productos" },
              { name: "Admin", href: "/login" },
            ].map((item, index) => (
              <li
                key={index}
                className="text-[#2B2B2B] hover:text-[#7A4E35] transition duration-300"
              >
                <Link href={item.href} onClick={handleLinkClick}>
                  {item.name}
                </Link>
              </li>
            ))}

            <li className="text-[#2B2B2B] hover:text-[#7A4E35] transition duration-300">
              <Link href="/carrito" onClick={handleLinkClick}>
                Carrito 🛒
                {carrito.length > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="bg-[#2F6B4F] text-white px-2 py-1 rounded-full ml-2 text-sm font-black shadow-md"
                  >
                    {carrito.length}
                  </motion.span>
                )}
              </Link>
            </li>

            {sucursal && (
              <li className="md:border-l md:border-[#7A4E35]/20 md:pl-5">
                <div className="flex flex-col md:items-end">
                  <span className="text-xs text-[#2F6B4F] uppercase tracking-widest font-black">
                    Sucursal
                  </span>

                  <span className="text-sm text-[#7A4E35] font-black">
                    {sucursal.nombre}
                  </span>

                  <button
                    onClick={() => {
                      cambiarSucursal();
                      setMenuOpen(false);
                    }}
                    className="text-xs text-[#7A4E35] underline hover:text-[#2F6B4F] mt-1 text-left md:text-right"
                  >
                    Cambiar
                  </button>
                </div>
              </li>
            )}
          </motion.ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;