// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCrNow56trFt7klg5cmyLvit5hb1X_YYPU",
  authDomain:        "cronicas-del-cazador.firebaseapp.com",
  projectId:         "cronicas-del-cazador",
  storageBucket:     "cronicas-del-cazador.firebasestorage.app",
  messagingSenderId: "195997854563",
  appId:             "1:195997854563:web:f72664697e2bd5c718c156"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
