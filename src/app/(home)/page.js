"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useSucursal } from "../context/SucursalContext";

const HomePage = () => {
  const { sucursal, elegirSucursal, cambiarSucursal } = useSucursal();

  return (
    <div className="min-h-screen bg-[#1B120D] text-white relative overflow-hidden">
      <section className="relative min-h-screen flex items-center justify-center px-5 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#7A4E35_0%,transparent_35%),radial-gradient(circle_at_bottom_right,#2F6B4F_0%,transparent_30%)] opacity-40" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.08)_50%,rgba(255,255,255,0.08)_75%,transparent_75%,transparent)] bg-[length:38px_38px] opacity-[0.05]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1B120D]/80 via-[#2A1A13]/90 to-[#120B08]" />

        <motion.div
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: [0.12, 0.2, 0.12], scale: [1, 1.06, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[-80px] top-20 w-[360px] h-[360px] rounded-full bg-[#E7C873] blur-[120px]"
        />

        <motion.div
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: [0.1, 0.18, 0.1], scale: [1, 1.08, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[-80px] bottom-10 w-[320px] h-[320px] rounded-full bg-[#2F6B4F] blur-[110px]"
        />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9 }}
          className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center max-w-6xl w-full"
        >
          <div className="bg-[#F8F5EF]/95 text-[#2B2B2B] border border-[#E7C873]/40 shadow-2xl rounded-[2rem] p-8 md:p-12">
            {!sucursal ? (
              <>
                <p className="text-[#2F6B4F] uppercase tracking-[0.35em] text-sm font-black mb-4">
                  Bienvenido a Jope
                </p>

                <h1 className="text-5xl md:text-7xl font-black leading-tight">
                  Elegí dónde querés pedir
                </h1>

                <p className="text-lg md:text-xl mt-5 text-[#2B2B2B]/75">
                  Cada sucursal tiene su propio menú, precios y disponibilidad.
                </p>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.button
                    onClick={() => elegirSucursal("luiggi")}
                    className="bg-[#7A4E35] text-white px-7 py-5 rounded-2xl text-lg font-black hover:bg-[#5F3825] transition shadow-lg"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    Ingeniero Luiggi
                    <span className="block text-sm font-semibold text-white/75 mt-1">
                      Pedir en esta sucursal
                    </span>
                  </motion.button>

                  <motion.button
                    onClick={() => elegirSucursal("santa_rosa")}
                    className="bg-[#2F6B4F] text-white px-7 py-5 rounded-2xl text-lg font-black hover:bg-[#24533D] transition shadow-lg"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    Santa Rosa
                    <span className="block text-sm font-semibold text-white/75 mt-1">
                      Pedir en esta sucursal
                    </span>
                  </motion.button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[#2F6B4F] uppercase tracking-[0.35em] text-sm font-black mb-4">
                  Pizzería Jope
                </p>

                <h1 className="text-4xl md:text-7xl font-black leading-tight">
                  Tu pedido empieza acá
                </h1>

                <p className="text-lg md:text-xl mt-5 text-[#2B2B2B]/75">
                  Sucursal seleccionada:{" "}
                  <span className="text-[#7A4E35] font-black">
                    {sucursal.nombre}
                  </span>
                </p>

                <div className="mt-8 flex flex-col md:flex-row gap-4">
                  <motion.a
                    href="/productos"
                    className="bg-[#7A4E35] text-white px-8 py-4 rounded-full text-lg font-black hover:bg-[#5F3825] transition shadow-lg text-center"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Ver menú
                  </motion.a>

                  <motion.a
                    href="/productos"
                    className="bg-[#E7C873] text-[#2B2B2B] px-8 py-4 rounded-full text-lg font-black hover:bg-[#F1D98D] transition shadow-lg text-center"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Hacer pedido
                  </motion.a>
                </div>

                <button
                  onClick={cambiarSucursal}
                  className="mt-6 text-sm text-[#7A4E35] underline hover:text-[#2F6B4F] font-bold"
                >
                  Cambiar sucursal
                </button>
              </>
            )}
          </div>

          <div className="relative">
            <div className="absolute -inset-3 bg-[#E7C873]/30 rounded-[2.5rem] blur-xl" />

            <div className="relative bg-[#2A1A13] border border-[#E7C873]/30 shadow-2xl rounded-[2rem] p-5">
              <div className="h-[360px] md:h-[480px] relative overflow-hidden rounded-[1.5rem] bg-[#120B08]">
                <Image
                  src="/logo.png"
                  alt="Pizzería Jope"
                  fill
                  style={{ objectFit: "cover" }}
                  className="opacity-80"
                />
              </div>

              <div className="absolute -bottom-5 left-8 right-8 bg-[#F8F5EF] text-[#2B2B2B] shadow-xl border border-[#E7C873]/40 rounded-2xl p-4 text-center">
                <p className="text-[#7A4E35] font-black">
                  Menú online por sucursal
                </p>
                <p className="text-sm text-[#2F6B4F] font-bold">
                  Elegí tu ciudad y pedí directo por WhatsApp
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {sucursal && (
        <section className="relative z-10 py-20 text-center bg-[#F8F5EF] px-5">
          <p className="text-[#2F6B4F] uppercase tracking-[0.35em] text-sm font-black mb-3">
            Jope online
          </p>

          <h3 className="text-4xl md:text-5xl font-black text-[#2B2B2B] mb-12">
            Pedí fácil, rápido y desde tu sucursal
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7 max-w-6xl mx-auto">
            {[
              {
                title: "Elegís tu ciudad",
                description:
                  "La web muestra solo los productos disponibles para esa sucursal.",
              },
              {
                title: "Armás tu pedido",
                description:
                  "Agregás pizzas, empanadas o promos al carrito de forma simple.",
              },
              {
                title: "Lo enviás por WhatsApp",
                description:
                  "El pedido llega directo a la sucursal correspondiente.",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 45 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative overflow-hidden bg-white border border-[#7A4E35]/10 p-8 rounded-3xl shadow-xl hover:-translate-y-2 transition-transform duration-300"
              >
                <div className="w-14 h-1 bg-[#E7C873] rounded-full mx-auto mb-5" />

                <h4 className="text-2xl font-black text-[#7A4E35] py-3">
                  {item.title}
                </h4>

                <p className="text-[#2B2B2B]/70 text-lg">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;