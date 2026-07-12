import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDp0PJtvkubhI8pEDEpfO6ncRNHu_ZOQ5M",
  authDomain: "dinpoz-movies.firebaseapp.com",
  databaseURL: "https://dinpoz-movies-default-rtdb.firebaseio.com",
  projectId: "dinpoz-movies",
  storageBucket: "dinpoz-movies.firebasestorage.app",
  messagingSenderId: "975575262322",
  appId: "1:975575262322:web:c036de88720bc46ff08eeb",
  measurementId: "G-DXN6VGNN0W",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
