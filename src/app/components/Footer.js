import React from 'react';
import { FaFacebook, FaTwitter, FaInstagram } from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-white text-center py-6 mt-10 rounded-lg">
            <div className="container mx-auto">
                <p className="mb-4">Contacto: contacto@pizzeriadesabor.com</p>
                <div className="flex justify-center space-x-4 mb-4">
                    <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-400">
                        <FaFacebook size={24} />
                    </a>
                    <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-400">
                        <FaTwitter size={24} />
                    </a>
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-400">
                        <FaInstagram size={24} />
                    </a>
                </div>
                <p>&copy; {new Date().getFullYear()} Pizzería Jope. Todos los derechos reservados.</p>
            </div>
        </footer>
    );
};

export default Footer;