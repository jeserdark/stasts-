# Estadísticas en vivo — instalación

Cada hora, GitHub ejecuta `scripts/update-stats.mjs`, consulta la API de Instagram
con el token de Miller y reescribe `stats.json`. La página lee ese archivo, así que
las cifras se actualizan solas. El token nunca está en la página.

## Qué se actualiza solo
- Seguidores de Instagram
- Visualizaciones, cuentas alcanzadas e interacciones de los últimos 30 días
- Vistas de cada reel de la galería

Facebook (3 K), TikTok (100) y los "Resultados de estrategia" se editan a mano en `stats.json`.

## Pasos (una sola vez)
1. Crea una cuenta en github.com (gratis) y un repositorio nuevo, por ejemplo `soymillerleydi`.
   Puede ser **privado** si vas a publicar con Netlify o Vercel; para GitHub Pages gratis debe ser público.
2. Sube **todo el contenido de esta carpeta**, incluida la carpeta oculta `.github`.
   La forma más fácil es con GitHub Desktop, o con *Add file → Upload files* en la web.
3. En el repositorio, entra a **Settings → Secrets and variables → Actions → New repository secret** y crea:
   - `IG_TOKEN` → el token que empieza por `EAA…`
   - `IG_USER_ID` → `17841400757869130`
4. Ve a la pestaña **Actions**, abre **Actualizar estadísticas** y dale **Run workflow** para probar.
   Si sale en verde, `stats.json` ya tiene datos reales. Si sale en rojo, abre el registro y mira el mensaje.
5. Publica la página con una de estas opciones:
   - **GitHub Pages:** Settings → Pages → *Deploy from a branch* → `main` / root.
   - **Netlify o Vercel:** "Import from GitHub" y elige el repositorio. Se vuelve a publicar sola cada vez que cambia `stats.json`.
6. Conecta tu dominio en la opción de hosting que elegiste.

## Para tener en cuenta
- La tarea corre cada hora. GitHub a veces la retrasa unos minutos.
- Si Miller cambia su contraseña o quita el acceso a la app, hay que generar un token nuevo y reemplazar `IG_TOKEN`.
- Para correrlo en tu computador: `IG_TOKEN=EAA… node scripts/update-stats.mjs` (requiere Node 18 o superior).
