# Rocket Space Simulator

![Logotipo de Rocket Space Simulator: un cohete despega sobre la Tierra](frontend/public/favicon.svg)

Entrenador de misiones en pixel art para niñas y niños de 8+ años. Hay tres misiones jugables:

1. **Eye on Earth**: empacar el cohete y dar una vuelta a la Tierra.
2. **Moon Mapper**: elegir base, día y hora, volar a la Luna, mapearla y volver.
3. **Red Planet Rover**: apuntar el crucero a Marte y posar un rover.

En el menú también aparecen **Lord of the Rings** (Saturno) y **The Black Hole**. Están marcadas como próximas: no se juegan y no dan estrellas.

La Tierra y la Luna empiezan abiertas. Marte se abre al completar la Luna. **Become admin** abre las misiones bloqueadas solo en este navegador y no reescribe las estrellas guardadas.

La primera visita puede mostrar un tráiler. Skip o Esc lo cierra. La página para el jurado está en `/project` y también en `#/project`. `?lang=es` la abre en español.

El prototipo se hizo con ayuda de IA (SI). Hay una sección **Uso de IA** en `/project`, y marcas de agua visibles en el menú y en el tráiler, según la política de Superinteligencia de Space Apps.

Licencia MIT. El texto completo está en [LICENSE](LICENSE). El aviso de copyright es de Steven Morales Fallas, 2026.

## Stack

- React 19 y Vite, en `frontend/`
- Python 3.14 y FastAPI, en `backend/`
- Firebase Auth, Firestore y Storage, con emuladores locales
- El sitio público se construye con Vercel. La API se publica con Render.

## Requisitos

- Node.js 24 y npm
- Python 3.14

## Estructura

```
frontend/                 Cliente React
  src/game/               Hangar y las tres misiones
    levels/orbit/         Misión 1, Eye on Earth
    levels/moon/          Misión 2, Moon Mapper
    levels/marsLaunch/    Misión 3, Red Planet Rover
  src/levels/             Menú, desbloqueo, estrellas y guardado
  src/intro/              Tráiler de la primera visita
  src/project/            Página /project para el jurado
  src/i18n/               Inglés por defecto y español
  src/settings/           Nombre, idioma y volumen
  src/audio/              Música y ambiente
  src/lib/                Sesión, Firebase, rutas y guardado en la nube
backend/                  API FastAPI. Hoy expone GET /health
firebase.json             Emuladores, reglas y hosting de frontend/dist
firestore.rules           Progreso y ajustes de cada jugador
firestore.indexes.json    Índices de Firestore. Hoy está vacío
storage.rules             Lectura y escritura cerradas
vercel.json               Build del cliente para Vercel
render.yaml               API en Render (Python 3.14.10)
```

El cliente habla con Firebase desde el navegador. El proxy `/api` de Vite apunta a `http://127.0.0.1:8000` y quita el prefijo `/api`. La API, de momento, responde en `/health` e inicia Firebase Admin si hay un id de proyecto y credenciales o emuladores.

## Puesta en marcha

Desde la raíz del proyecto:

```powershell
npm install
npm install --prefix frontend
py -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
copy frontend\.env.example frontend\.env.local
copy backend\.env.example backend\.env
```

`npm install` en la raíz instala la CLI de Firebase. El segundo instala el cliente. El entorno virtual de Python no se versiona.

El proyecto de Firebase es `rocket-space-simulator`. La configuración web, incluida Analytics y el cliente de Google, está en `frontend/.env.example`. Al copiarla a `frontend/.env.local` el cliente usa ese proyecto. Esas claves viajan en el navegador. Pon `VITE_USE_FIREBASE_EMULATORS=true` solo cuando los emuladores locales estén en marcha.

`backend/.env.example` apunta la API a los emuladores. Para un proyecto real, comenta esas tres variables y define `GOOGLE_APPLICATION_CREDENTIALS`. `CORS_ORIGINS` es opcional en local: si no está, la API acepta `http://localhost:5173` y `http://127.0.0.1:5173`.

```powershell
npx firebase login
npx firebase use --add
```

## Arranque local

Tres terminales, desde la raíz:

```powershell
npm run emulators
npm run dev:api
npm run dev:web
```

| Servicio   | Dirección                      |
| ---------- | ------------------------------ |
| Web        | http://localhost:5173          |
| API        | http://127.0.0.1:8000/health   |
| Emuladores | http://127.0.0.1:4000          |

`npm run dev:api` usa el Python del entorno virtual en Windows (`backend\.venv\Scripts\python.exe`).

`npm run build:web` genera el cliente en `frontend/dist`.
`npm run preview --prefix frontend` sirve ese build en local.
`npm test` corre todas las pruebas de Node. `npm run lint` corre oxlint.

| Script | Qué cubre |
| --- | --- |
| `npm test` | Progreso, rutas, i18n, página del jurado, plan de misión, Luna y Marte |
| `npm run test:moon` | Recursos, eventos y física del viaje lunar |
| `npm run test:plan` | Plan de misión del hangar |
| `npm run test:route` | Hash de la pantalla abierta |
| `npm run test:mars` | Ruta del crucero a Marte |
| `npm run test:i18n` | Cobertura del español |

## Rutas

El juego abierto vive en el hash, así que un refresco se queda en la misma pantalla:

```
#/                                          menú
#/earth/hangar?pack=food.1                  hangar, con piezas ya puestas
#/moon/launch/site?site=kennedy&pack=...    elección de base
#/moon/launch/aim?site=kennedy&pack=...     apuntado, o un vuelo en curso
/project                                    página del jurado
/project?lang=es                            la misma página en español
```

## Datos del jugador

Con Firebase configurado, el juego entra con una sesión anónima y guarda en Firestore. En Ajustes, el botón de Google pide la cuenta en esta misma página, mediante Google Identity Services, para que una llave de acceso o la contraseña puedan terminar. Si esa cuenta se enlaza a la sesión anónima, se conservan las estrellas. El punto rojo del botón de ajustes avisa cuando falta el nombre o la sesión de Google. En el mismo panel se cambia el idioma: inglés por defecto, o español.

- `progress/{uid}`: `version`, `updatedAt` y `missions` con `earth`, `moon` y `mars`. Cada misión guarda `completed`, `stars`, `bestPct` y `attempts`.
- `progress/{uid}/flights/{id}`: cada viaje, aunque se repita, con `missionId`, `at`, `success`, `pct`, `stars`, `packed` y `picks` (`site`, `orbit`, `window`, `craft`, `place`). Solo se crea; no se edita ni se borra.
- `settings/{uid}`: `playerName` (hasta 16 caracteres), `language` (`en` o `es`), `musicVolume`, `ambientVolume` y `updatedAt`.

Cada documento solo lo puede leer y escribir ese jugador. También queda una copia en el navegador por si la red falla. El hash conserva el hangar en curso; Firestore recibe el viaje cuando termina.

El modo admin y el tráiler ya visto se quedan en este navegador. No van a Firestore.

Las reglas de Firestore tienen que aceptar `language`. Si cambias las reglas:

```powershell
npx firebase deploy --only firestore:rules
```

`firebase.json` declara el proveedor anónimo para los emuladores. El acceso con Google se configura en la consola de Firebase y en `VITE_GOOGLE_CLIENT_ID`. Storage sigue cerrado: el juego no sube archivos.

## Publicación

- **Vercel** (`vercel.json`): framework Vite, Node 24, instala y construye `frontend/`, publica `frontend/dist` y reescribe las rutas sin extensión a `index.html`. Producción: [https://rocket-space-simulator.vercel.app](https://rocket-space-simulator.vercel.app). El origen permitido por la API es ese dominio, además de los dominios de vista previa del mismo proyecto.
- Cada `git push` a `main` publica producción, y un push a `feature/*` o `GamePlay` publica un Preview, con el workflow [`.github/workflows/deploy-vercel.yml`](.github/workflows/deploy-vercel.yml) y los secretos `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`.
- Publicación manual local:

```powershell
npm run deploy:web
```
- **Render** (`render.yaml`): servicio `rocket-space-simulator-api`, Python 3.14.10, arranque con uvicorn y revisión en `/health`.
- **Firebase Hosting** también puede publicar `frontend/dist`. Los emuladores y las reglas siguen en `firebase.json`.
