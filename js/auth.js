// js/auth.js
import { auth } from "./firebase-config.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// ── REGISTRO ──
const registroForm = document.getElementById('registro-form');
if (registroForm) {
    const btnSubmit = registroForm.querySelector('button[type="submit"]');

    registroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const username = document.getElementById('username').value.trim();

        if (!username) { mostrarError('Por favor ingresa un nombre de usuario.'); return; }
        if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = 'Creando cuenta...'; }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: username });
            await userCredential.user.reload();
            window.location.href = "dashboard.html";
        } catch (error) {
            if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = 'Crear cuenta'; }
            mostrarError(traducirError(error.code));
        }
    });
}

// ── LOGIN ──
const loginForm = document.getElementById('login-form');
if (loginForm) {
    const btnSubmit = loginForm.querySelector('button[type="submit"]');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = 'Entrando...'; }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "dashboard.html";
        } catch (error) {
            if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = 'Iniciar Sesión'; }
            mostrarError(traducirError(error.code));
        }
    });
}

// ── PROTECCIÓN DE RUTAS ──
onAuthStateChanged(auth, (user) => {
    if (window.location.pathname.includes("dashboard.html") && !user) {
        window.location.href = "login.html";
    }
});

// ── HELPERS ──
function mostrarError(mensaje) {
    let el = document.getElementById('auth-error');
    if (!el) {
        el = document.createElement('div');
        el.id = 'auth-error';
        el.style.cssText = `
            margin-top: 12px; padding: 10px 16px;
            background: rgba(192,57,43,0.1);
            border: 1px solid rgba(192,57,43,0.4);
            color: #e57373; font-size: 13px;
            font-family: 'Raleway', sans-serif;
            line-height: 1.5;
        `;
        const form = document.getElementById('registro-form') || document.getElementById('login-form');
        if (form) form.after(el);
    }
    el.textContent = mensaje;
}

function traducirError(code) {
    const errores = {
        'auth/email-already-in-use':   'Este correo ya está registrado. ¿Ya eres cazador? Inicia sesión.',
        'auth/invalid-email':          'El correo ingresado no es válido.',
        'auth/weak-password':          'La contraseña debe tener al menos 6 caracteres.',
        'auth/user-not-found':         'No existe una cuenta con ese correo.',
        'auth/wrong-password':         'Contraseña incorrecta.',
        'auth/too-many-requests':      'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
        'auth/invalid-credential':     'Correo o contraseña incorrectos.',
    };
    return errores[code] || 'Ocurrió un error inesperado. Intenta de nuevo.';
}
