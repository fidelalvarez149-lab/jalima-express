# JALIMA EXPRESS — primera versión multiplataforma

Esta carpeta contiene una **aplicación web progresiva (PWA)**. Se puede abrir en Android, iPhone y computadora desde un navegador. En teléfonos compatibles se puede instalar en la pantalla de inicio. No es todavía una app nativa publicada en Google Play o App Store.

## Qué incluye esta primera versión

- Inicio de sesión con correo y contraseña usando Firebase Authentication.
- Primera cuenta creada: perfil de administrador/recepción.
- Cuentas posteriores: perfil de repartidor.
- Registro y sincronización en tiempo real de pedidos entre dispositivos.
- Datos del cliente, teléfono, dirección, detalle, monto y costo de delivery.
- Estados: pendiente, en reparto y entregado.
- Ubicación GPS opcional para cada pedido.
- Apertura de un destino en Google Maps.
- Orden sugerido de paradas por cercanía geográfica desde la ubicación actual.
- Personalización local inicial de nombre, color y logotipo.

## Lo que requiere una segunda fase

La ruta actual usa distancia geográfica aproximada (línea recta); **no** calcula todavía la ruta vial óptima ni dibuja una ruta completa sobre un mapa integrado. Para eso se integrará Google Maps Routes/Directions y geocodificación.

El envío automático de WhatsApp no está activado. Requiere una cuenta de WhatsApp Business Platform/Cloud API, plantillas aprobadas y un backend seguro (por ejemplo Firebase Cloud Functions). No se deben guardar tokens de WhatsApp en archivos públicos de GitHub.

El código de invitación, administración avanzada de roles, notificaciones push, sincronización del logotipo/tema entre todos los dispositivos y controles de seguridad de producción también se implementarán en fases posteriores.

## Publicar con GitHub Pages desde Android

1. En GitHub crea un repositorio nuevo llamado `jalima-express`.
2. Sube todos los archivos de esta carpeta a la raíz del repositorio.
3. Entra en **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Selecciona la rama `main` y la carpeta `/ (root)`, y guarda.
6. Espera a que GitHub Pages publique el sitio. La dirección será parecida a `https://TU-USUARIO.github.io/jalima-express/`.

GitHub Pages solo aloja la interfaz. Firebase es necesario para que los pedidos se compartan entre teléfonos.

## Configurar Firebase

1. Entra en https://console.firebase.google.com/ y crea un proyecto llamado `jalima-express`.
2. Agrega una aplicación web al proyecto y copia el objeto de configuración que Firebase muestra.
3. En Firebase habilita **Authentication → Sign-in method → Email/Password**.
4. Crea una base de datos en **Firestore Database**.
5. Copia el contenido de `firestore.rules` en la pestaña **Rules** de Firestore y publica las reglas.
6. Abre `app.js` en GitHub y reemplaza los valores `REEMPLAZA...` dentro de `firebaseConfig` con los datos reales de tu proyecto.
7. Guarda los cambios y espera a que GitHub Pages vuelva a publicar.

**Importante:** estas reglas son solo para una prueba inicial. Antes de utilizar datos reales, hay que reforzar los permisos y validar los roles desde un backend. No uses datos sensibles de clientes hasta completar esa etapa.

## Crear las dos cuentas

1. Abre la dirección publicada en el primer teléfono y crea la primera cuenta: será la cuenta administradora que registra pedidos.
2. En el segundo teléfono abre la misma dirección y crea otra cuenta: tendrá perfil de repartidor.
3. Ambos dispositivos deben tener internet e iniciar sesión. Los pedidos se sincronizan mediante Firestore.

## Instalar en el teléfono

- **Android:** abre el sitio en Chrome, menú ⋮ → “Instalar aplicación” o “Agregar a pantalla principal”.
- **iPhone:** abre el sitio en Safari, botón Compartir → “Añadir a pantalla de inicio”.
- **Computadora:** abre la dirección en Chrome, Edge o Safari.

## Nota sobre el logotipo

La personalización de logotipo de esta versión se guarda localmente en el navegador. La siguiente fase debe moverla a Firebase Storage para que se actualice en todos los dispositivos.
