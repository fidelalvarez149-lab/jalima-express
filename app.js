// JALIMA EXPRESS — Pedidos y entregas
// 1) Reemplaza los valores de firebaseConfig por los de tu proyecto (ver README.md).

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, addDoc, updateDoc,
  onSnapshot, query, where, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// ---------- Utilidades ----------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dinero = (n) => "C$ " + Number(n || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ESTADOS = {
  nuevo: "Nuevo", asignado: "Asignado", en_camino: "En camino",
  entregado: "Entregado", cancelado: "Cancelado"
};

let toastTimer;
function aviso(texto, esError = false) {
  const t = $("mensaje");
  t.textContent = texto;
  t.className = "toast" + (esError ? " error" : "");
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
}

function errorAmigable(e) {
  const m = {
    "auth/invalid-email": "El correo no es válido.",
    "auth/missing-password": "Escribe la contraseña.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/email-already-in-use": "Ese correo ya tiene una cuenta.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/too-many-requests": "Demasiados intentos. Espera un momento.",
    "auth/network-request-failed": "Sin conexión a internet.",
    "permission-denied": "No tienes permiso para esta acción (revisa las reglas de Firestore)."
  };
  return m[e?.code] || "Ocurrió un error: " + (e?.message || e);
}

function mostrarVista(nombre) {
  for (const v of ["vista-auth", "vista-negocio", "vista-repartidor"]) {
    $(v).hidden = v !== nombre;
  }
  $("btn-salir").hidden = nombre === "vista-auth" || nombre === null;
}

// ---------- Firebase ----------
const configurado = !Object.values(firebaseConfig).some((v) => String(v).startsWith("TU_"));

if (!configurado) {
  $("aviso-firebase").hidden = false;
  mostrarVista("vista-auth");
  $("form-auth").addEventListener("submit", (e) => {
    e.preventDefault();
    aviso("Primero conecta Firebase en app.js.", true);
  });
  $("btn-alternar").addEventListener("click", () => aviso("Primero conecta Firebase en app.js.", true));
} else {
  iniciarApp();
}

function iniciarApp() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  let usuario = null;          // { uid, nombre, rol }
  let modoRegistro = false;
  let registrando = false;
  let desuscribir = null;
  let pedidos = [];
  let pestana = "disponibles";

  // ----- Login / registro -----
  function setModo(registro) {
    modoRegistro = registro;
    $("campos-registro").hidden = !registro;
    $("auth-titulo").textContent = registro ? "Crear cuenta" : "Ingresar a JALIMA EXPRESS";
    $("btn-principal").textContent = registro ? "Registrarme" : "Iniciar sesión";
    $("btn-alternar").textContent = registro ? "Ya tengo cuenta" : "Crear cuenta";
    $("password").autocomplete = registro ? "new-password" : "current-password";
  }
  $("btn-alternar").addEventListener("click", () => setModo(!modoRegistro));

  $("form-auth").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("email").value.trim();
    const password = $("password").value;
    if (!email || !password) return aviso("Escribe correo y contraseña.", true);

    const btn = $("btn-principal");
    btn.disabled = true;
    try {
      if (modoRegistro) {
        const nombre = $("nombre").value.trim();
        const rol = $("rol").value;
        if (!nombre) { btn.disabled = false; return aviso("Escribe tu nombre.", true); }
        registrando = true;
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), {
          nombre, rol, email, creadoEn: serverTimestamp()
        });
        registrando = false;
        await entrar(cred.user);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      registrando = false;
      aviso(errorAmigable(err), true);
    } finally {
      btn.disabled = false;
    }
  });

  $("btn-salir").addEventListener("click", () => signOut(auth));

  onAuthStateChanged(auth, async (user) => {
    if (registrando) return; // el registro llama a entrar() al terminar
    if (!user) return salir();
    await entrar(user);
  });

  async function entrar(user) {
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) {
        aviso("Tu cuenta no tiene perfil. Crea una cuenta nueva.", true);
        await signOut(auth);
        return;
      }
      usuario = { uid: user.uid, ...snap.data() };
      $("form-auth").reset();
      setModo(false);
      if (usuario.rol === "repartidor") {
        mostrarVista("vista-repartidor");
        escucharRepartidor();
      } else {
        mostrarVista("vista-negocio");
        escucharNegocio();
      }
    } catch (err) {
      aviso(errorAmigable(err), true);
    }
  }

  function salir() {
    if (desuscribir) { desuscribir(); desuscribir = null; }
    usuario = null;
    pedidos = [];
    mostrarVista("vista-auth");
  }

  // ----- Datos en tiempo real -----
  const ms = (p) => p.creadoEn?.toMillis?.() ?? Date.now();

  function escuchar(q, render) {
    if (desuscribir) desuscribir();
    desuscribir = onSnapshot(q, (snap) => {
      pedidos = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b) - ms(a));
      render();
    }, (err) => aviso(errorAmigable(err), true));
  }

  function escucharNegocio() {
    escuchar(query(collection(db, "pedidos"), where("creadoPor", "==", usuario.uid)), renderNegocio);
  }
  function escucharRepartidor() {
    escuchar(collection(db, "pedidos"), renderRepartidor);
  }

  // ----- Negocio -----
  $("form-pedido").addEventListener("submit", async (e) => {
    e.preventDefault();
    const cliente = $("p-cliente").value.trim();
    const telefono = $("p-telefono").value.trim();
    const direccion = $("p-direccion").value.trim();
    const detalle = $("p-detalle").value.trim();
    const monto = Number($("p-monto").value) || 0;
    if (!cliente || !telefono || !direccion || !detalle) {
      return aviso("Completa cliente, teléfono, dirección y detalle.", true);
    }
    try {
      await addDoc(collection(db, "pedidos"), {
        cliente, telefono, direccion, detalle, monto,
        estado: "nuevo",
        creadoPor: usuario.uid,
        negocio: usuario.nombre,
        repartidorId: null,
        repartidorNombre: null,
        creadoEn: serverTimestamp()
      });
      e.target.reset();
      $("p-monto").value = 0;
      aviso("Pedido registrado.");
    } catch (err) {
      aviso(errorAmigable(err), true);
    }
  });

  function tarjeta(p, botones) {
    const mapa = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.direccion || "");
    return `
      <article class="pedido">
        <div class="pedido-cab">
          <h3>${esc(p.cliente)}</h3>
          <span class="badge ${esc(p.estado)}">${esc(ESTADOS[p.estado] || p.estado)}</span>
        </div>
        <p>${esc(p.detalle)}</p>
        <p>📍 ${esc(p.direccion)}</p>
        <p>📞 ${esc(p.telefono)} · <span class="monto">${dinero(p.monto)}</span></p>
        ${p.repartidorNombre ? `<p>🛵 ${esc(p.repartidorNombre)}</p>` : ""}
        <div class="acciones">
          ${botones}
          <a class="btn btn-secundario chico" href="tel:${esc(p.telefono)}">Llamar</a>
          <a class="btn btn-secundario chico" href="${mapa}" target="_blank" rel="noopener">Mapa</a>
        </div>
      </article>`;
  }

  function renderNegocio() {
    const cont = $("lista-negocio");
    if (!pedidos.length) {
      cont.innerHTML = '<p class="vacio">Aún no hay pedidos.</p>';
      return;
    }
    cont.innerHTML = pedidos.map((p) => tarjeta(p,
      p.estado === "nuevo"
        ? `<button class="btn btn-peligro chico" data-accion="cancelar" data-id="${esc(p.id)}">Cancelar</button>`
        : ""
    )).join("");
  }

  $("lista-negocio").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-accion]");
    if (!b) return;
    if (b.dataset.accion === "cancelar" && confirm("¿Cancelar este pedido?")) {
      try {
        await updateDoc(doc(db, "pedidos", b.dataset.id), { estado: "cancelado" });
      } catch (err) { aviso(errorAmigable(err), true); }
    }
  });

  // ----- Repartidor -----
  function cambiarPestana(p) {
    pestana = p;
    $("tab-disponibles").classList.toggle("activa", p === "disponibles");
    $("tab-mios").classList.toggle("activa", p === "mios");
    renderRepartidor();
  }
  $("tab-disponibles").addEventListener("click", () => cambiarPestana("disponibles"));
  $("tab-mios").addEventListener("click", () => cambiarPestana("mios"));

  function renderRepartidor() {
    const cont = $("lista-repartidor");
    const lista = pestana === "disponibles"
      ? pedidos.filter((p) => p.estado === "nuevo")
      : pedidos.filter((p) => p.repartidorId === usuario.uid);

    if (!lista.length) {
      cont.innerHTML = `<p class="vacio">${pestana === "disponibles" ? "No hay pedidos disponibles." : "Aún no tienes entregas."}</p>`;
      return;
    }
    cont.innerHTML = lista.map((p) => {
      let b = "";
      if (p.estado === "nuevo") {
        b = `<button class="btn btn-primario chico" data-accion="tomar" data-id="${esc(p.id)}">Tomar pedido</button>`;
      } else if (p.estado === "asignado") {
        b = `<button class="btn btn-primario chico" data-accion="en_camino" data-id="${esc(p.id)}">Salir a entregar</button>`;
      } else if (p.estado === "en_camino") {
        b = `<button class="btn btn-ok chico" data-accion="entregado" data-id="${esc(p.id)}">Marcar entregado</button>`;
      }
      return tarjeta(p, b);
    }).join("");
  }

  $("lista-repartidor").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-accion]");
    if (!b) return;
    const ref = doc(db, "pedidos", b.dataset.id);
    b.disabled = true;
    try {
      if (b.dataset.accion === "tomar") {
        await runTransaction(db, async (tx) => {
          const s = await tx.get(ref);
          if (!s.exists() || s.data().estado !== "nuevo") throw new Error("Otro repartidor ya tomó este pedido.");
          tx.update(ref, { estado: "asignado", repartidorId: usuario.uid, repartidorNombre: usuario.nombre });
        });
        aviso("Pedido asignado a ti.");
        cambiarPestana("mios");
      } else {
        await updateDoc(ref, { estado: b.dataset.accion });
      }
    } catch (err) {
      aviso(errorAmigable(err), true);
      b.disabled = false;
    }
  });
}
