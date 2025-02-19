"use client";

import { motion } from "framer-motion";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 p-8">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 bg-black bg-opacity-60 p-8 rounded-lg"
        >
          <h1 className="text-6xl font-extrabold text-white drop-shadow-lg">
            ¡Bienvenidos a Pizzería Jope!
          </h1>
          <p className="text-xl mt-3 text-white">
            Las pizzas más deliciosas y auténticas te esperan
          </p>
        </motion.div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-white text-center text-gray-900 rounded-lg shadow-lg p-6">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-5xl font-bold">Sabor que Enamora</h2>
          <p className="text-lg mt-4 text-gray-700">
            Nuestras pizzas están hechas con ingredientes frescos y una receta tradicional que deleita en cada bocado.
          </p>
        </motion.div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 text-center">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold text-white mb-6"
        >
          ¿Por qué elegirnos?
        </motion.h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {["Masa artesanal", "Ingredientes frescos", "Sabor inigualable", "Entrega rápida"].map((title, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <h4 className="text-xl font-bold text-gray-900 py-4">{title}</h4>
              <p className="text-gray-700">Disfruta de la mejor calidad en cada bocado.</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-red-600 text-white text-center py-14 rounded-lg shadow-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h3 className="text-4xl font-bold">¡Haz tu pedido ahora!</h3>
          <p className="mt-2 text-lg">Explora nuestro menú y elige tu pizza favorita</p>
          <a href="/productos">
            <button className="mt-6 bg-white text-red-600 px-10 py-4 rounded-full font-bold text-xl hover:bg-gray-200 transition">
              Ver Menú
            </button>
          </a>
        </motion.div>
      </section>
    </div>
  );
};

export default HomePage;