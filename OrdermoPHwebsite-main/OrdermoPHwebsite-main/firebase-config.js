// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCqI09D4PulnCIgtB5SUCDlONG8ohiZKH0",
  authDomain: "ordermoph-21c5d.firebaseapp.com",
  projectId: "ordermoph-21c5d",
  storageBucket: "ordermoph-21c5d.firebasestorage.app",
  messagingSenderId: "899725190602",
  appId: "1:899725190602:web:31321baedf9239993e5b33",
  measurementId: "G-4RCRRC5HYD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
