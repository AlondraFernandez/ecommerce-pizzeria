"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Image with Parallax Effect */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: [0, -50, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 left-0 w-full h-full z-0"
      >
        <Image
          src="/logo.png"
          alt="Pizza background"
          layout="fill"
          objectFit="cover"
          className="opacity-30"
        />
      </motion.div>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative z-10 bg-black bg-opacity-70 p-12 rounded-lg backdrop-blur-lg"
        >
          <motion.h1
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-7xl font-extrabold text-white drop-shadow-lg"
          >
            Hecho fresco a la orden
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-2xl mt-3 text-gray-200"
          >
            Deléitate con el sabor más auténtico de la pizza artesanal
          </motion.p>
          <div className="mt-6 flex justify-center gap-8">
            <motion.a
              href="/productos"
              className="bg-red-600 px-8 py-4 rounded-full text-lg font-bold hover:bg-red-700 transition"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              Ver Menú
            </motion.a>
            <motion.a
              href="/comprar"
              className="bg-white text-red-600 px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-200 transition"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              Comprar Online
            </motion.a>
          </div>
        </motion.div>
      </section>

      {/* Features Section - Redesigned */}
      <section className="py-20 text-center relative bg-gray-900">
        <motion.h3
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-extrabold text-white mb-12"
        >
          ¿Por qué elegirnos?
        </motion.h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 max-w-6xl mx-auto">
          {[
            { title: "Masa artesanal", description: "Disfruta de la mejor masa artesanal, hecha a mano." },
            { title: "Ingredientes frescos", description: "Solo usamos ingredientes frescos y naturales." },
            { title: "Sabor inigualable", description: "Cada bocado te sorprenderá con su sabor único." },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.3 }}
              className="group relative overflow-hidden bg-red-600 p-8 rounded-3xl shadow-2xl hover:scale-105 transition-transform duration-300 cursor-pointer"
            >
              <motion.div
                className="absolute inset-0 bg-black opacity-0 group-hover:opacity-50 transition-opacity duration-300"
              />
              <motion.h4
                className="text-2xl font-extrabold text-white py-4 relative z-10"
              >
                {item.title}
              </motion.h4>
              <p className="text-white text-lg relative z-10">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
