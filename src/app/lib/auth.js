// src/lib/auth.js
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase";

// Función para iniciar sesión
export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error de login:", error.message);
    throw new Error("Error de login");
  }
};

// Función para registrar un nuevo usuario
export const register = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error de registro:", error.message);
    throw new Error("Error de registro");
  }
};

// Función para cerrar sesión
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error de logout:", error.message);
    throw new Error("Error de logout");
  }
};
