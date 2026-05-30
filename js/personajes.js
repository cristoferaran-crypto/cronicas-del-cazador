// js/personajes.js
// Módulo centralizado para operaciones de personajes en Firestore

import { db, auth } from "./firebase-config.js";
import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    getDocs, getDoc, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// ── GUARDAR personaje nuevo ──
export async function guardarPersonaje(data) {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado.");

    const docRef = await addDoc(collection(db, "personajes"), {
        ...data,
        userId:    user.uid,
        jugador:   user.displayName || user.email.split('@')[0],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return docRef.id;
}

// ── ACTUALIZAR personaje existente ──
export async function actualizarPersonaje(id, data) {
    const ref = doc(db, "personajes", id);
    await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

// ── ELIMINAR personaje ──
export async function eliminarPersonaje(id) {
    await deleteDoc(doc(db, "personajes", id));
}

// ── OBTENER personajes del usuario actual ──
export async function obtenerMisPersonajes() {
    const user = auth.currentUser;
    if (!user) return [];

    const q = query(
        collection(db, "personajes"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── OBTENER un personaje por ID ──
export async function obtenerPersonaje(id) {
    const snap = await getDoc(doc(db, "personajes", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

// ── OBTENER personajes de una campaña ──
export async function obtenerPersonajesCampana(campanaId) {
    const q = query(
        collection(db, "personajes"),
        where("campanaId", "==", campanaId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── UNIRSE a una campaña ──
export async function unirseACampana(personajeId, campanaId) {
    await actualizarPersonaje(personajeId, { campanaId });
}

// ── SALIR de una campaña ──
export async function salirDeCampana(personajeId) {
    await actualizarPersonaje(personajeId, { campanaId: null });
}
