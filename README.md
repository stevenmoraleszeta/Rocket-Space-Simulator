# Rocket Space Simulator

![Logotipo de Rocket Space Simulator: un cohete despega sobre la Tierra](frontend/public/favicon.svg)

Base de un videojuego espacial. El cliente, la API y Firebase quedan conectados. Todavía no hay lógica del juego.

Licencia MIT. El texto completo está en [LICENSE](LICENSE).

## Stack

- React 19 y Vite, en `frontend/`
- Python 3.14 y FastAPI, en `backend/`
- Firebase Auth, Firestore y Storage, con emuladores locales

## Requisitos

- Node.js 24 y npm
- Python 3.14

## Estructura

```
frontend/          Cliente React. Firebase se inicializa en src/lib/firebase.js
backend/           API FastAPI. Dependencias en requirements.txt
firebase.json      Emuladores, reglas y hosting del build de frontend/dist
firestore.rules    Cada jugador solo lee y escribe su progreso y sus ajustes
storage.rules      Lectura y escritura cerradas
```

El cliente llega a la API por el proxy `/api` de Vite, que apunta a `http://127.0.0.1:8000`.

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

El proyecto de Firebase es `rocket-space-simulator`. La configuración web, incluida Analytics, está en `frontend/.env.example`; al copiarla a `frontend/.env.local` el cliente usa ese proyecto. Pon `VITE_USE_FIREBASE_EMULATORS=true` solo cuando quieras los emuladores locales.

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

`npm run build:web` genera el cliente en `frontend/dist`, que es la carpeta que publica Firebase Hosting.

## Datos del jugador

Con Firebase configurado, el juego entra con una sesión anónima y guarda en Firestore. En Ajustes se puede iniciar sesión con Google. Si esa cuenta se enlaza a la sesión anónima, se conservan las estrellas. El punto rojo del botón de ajustes avisa cuando falta el nombre o la sesión de Google.

- `progress/{uid}`: misiones completadas, estrellas, mejor puntaje e intentos
- `progress/{uid}/flights/{id}`: cada viaje, aunque se repita, con lo empacado y las elecciones (base, órbita, ventana, lugar)
- `settings/{uid}`: nombre del jugador y volumen de la música y del ambiente

Cada documento solo lo puede leer y escribir ese jugador. También queda una copia en el navegador por si la red falla. El hangar en curso no se guarda hasta que el viaje termina.

El acceso anónimo ya está activo y las reglas de Firestore ya están publicadas. El botón de Google sigue apagado hasta activar ese proveedor en Authentication. Si cambias las reglas o los proveedores:

```powershell
npx firebase deploy --only firestore:rules
npx firebase deploy --only auth
```

Storage sigue cerrado: el juego no sube archivos.
