import React from 'react';
import { FaFacebook, FaTwitter, FaInstagram } from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-white text-center py-6 mt-10 rounded-lg">
            <div className="container mx-auto">
                <p className="mb-4">creado por Alo Fernandez</p>
                <div className="flex justify-center space-x-4 mb-4">
                    <a href="https://www.facebook.com/jope.cervini" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-400">
                        <FaFacebook size={24} />
                    </a>
                    <a href="https://www.instagram.com/pizzeria_jope/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-400">
                        <FaInstagram size={24} />
                    </a>
                </div>
                <p>&copy; {new Date().getFullYear()} Pizzería Jope. Todos los derechos reservados.</p>
            </div>
        </footer>
    );
};

export default Footer;