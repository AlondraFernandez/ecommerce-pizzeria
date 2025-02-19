// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB4vkqnB1AVRKRA7y7uczELvxpgcVPMJr8",
  authDomain: "ecommerce-pizzeria.firebaseapp.com",
  projectId: "ecommerce-pizzeria",
  storageBucket: "ecommerce-pizzeria.appspot.com",
  messagingSenderId: "457945495630",
  appId: "1:457945495630:web:1be2a44e18d1edd9b8ab1f"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };