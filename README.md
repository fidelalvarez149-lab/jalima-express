# JALIMA EXPRESS — Pedidos y entregas

App web (funciona como PWA en el celular) con dos tipos de cuenta:

- **Teléfono que recibe pedidos** (negocio): registra pedidos y ve su estado en tiempo real.
- **Repartidor**: ve pedidos disponibles, toma uno, sale a entregar y lo marca como entregado.

Los montos están en córdobas (C$).

## 1. Crear el proyecto en Firebase

1. Entra a https://console.firebase.google.com y crea un proyecto.
2. **Authentication → Comenzar → Correo electrónico/contraseña → Habilitar**.
3. **Firestore Database → Crear base de datos** (modo producción, región cercana).
4. En Firestore ve a **Reglas**, pega el contenido de `firestore.rules` y pulsa **Publicar**.
5. **Configuración del proyecto (⚙) → Tus apps → Web (`</>`)**, registra la app y copia el objeto `firebaseConfig`.

## 2. Conectar la app

Abre `app.js` y reemplaza los valores de `firebaseConfig` (los que empiezan con `TU_`) por los que copiaste. Cuando estén bien puestos, el aviso naranja "Falta conectar Firebase" desaparece solo.

## 3. Publicar o probar

La app usa módulos ES, así que **no funciona abriendo `index.html` con doble clic** (`file://`). Opciones:

- **Probar en la PC:** `python3 -m http.server 8000` dentro de la carpeta y abre http://localhost:8000
- **Publicar gratis:** Firebase Hosting (`firebase deploy`), Netlify, Vercel o GitHub Pages.

En Firebase: **Authentication → Configuración → Dominios autorizados** agrega el dominio donde publiques.

## 4. Usar

1. En un teléfono: **Crear cuenta** → tipo "Teléfono que recibe pedidos".
2. En otro teléfono: **Crear cuenta** → tipo "Repartidor".
3. El negocio registra pedidos; el repartidor los ve al instante.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Pantallas |
| `styles.css` | Estilos |
| `app.js` | Lógica y conexión a Firebase |
| `firestore.rules` | Reglas de seguridad de la base de datos |
