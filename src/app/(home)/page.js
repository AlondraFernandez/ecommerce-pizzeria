"use client";

import { motion } from "framer-motion"; // Animaciones

const HomePage = () => {
  return (
    <div className="home">
      <section 
        className="relative h-[500px] bg-cover bg-center flex items-center justify-center text-dark text-center"
        style={{ backgroundImage: 'url(/img/background.png)' }} // Imagen de fondo
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.8 }}
          className="bg-black bg-opacity-50 p-6 rounded-lg"
        >
          <h1 className="text-5xl font-bold text-yellow-400">¡Bienvenidos a Pizzeria Jope!</h1>
          <p className="text-lg mt-2 text-yellow-200">Las pizzas más deliciosas te esperan</p>
        </motion.div>
      </section>

      {/* Sección destacada */}
      <section className="py-16 bg-gradient-to-r from-yellow-400 via-red-500 to-red-600 text-center text-white">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-bold"> Con un sabor auténtico</h2>
          <p className="text-lg mt-4 max-w-2xl mx-auto">
            Nuestra pizza está hecha con ingredientes frescos y una receta tradicional que deleita a cada bocado.
          </p>
        </motion.div>
      </section>

      {/* Llamada a la acción */}
      <section className="bg-gradient-to-r from-red-600 to-red-800 text-white text-center py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8 }}
        >
          <h3 className="text-3xl font-bold">¡Haz tu pedido ahora!</h3>
          <p className="mt-2 text-lg">Explora nuestro menú y elige tu pizza favorita</p>
          <a href="/productos">
            <button className="mt-4 bg-yellow-400 text-red-800 px-8 py-3 rounded-full font-bold text-lg hover:bg-yellow-300 transition">
              Ver menú
            </button>
          </a>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center py-6">
        <p>Contacto: contacto@pizzeriadesabor.com | Síguenos en nuestras redes sociales</p>
      </footer>
    </div>
  );
};

export default HomePage;

