# Rocket Space Simulator

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
firestore.rules    Lectura y escritura cerradas
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

En [Firebase Console](https://console.firebase.google.com) crea un proyecto y sustituye `rocket-space-simulator` en `.firebaserc` por el id real. Pega la configuración web en `frontend/.env.local`. Con `VITE_USE_FIREBASE_EMULATORS=true`, el cliente puede usar los emuladores aunque esas claves sigan vacías.

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

Firestore y Storage quedan cerrados (`allow read, write: if false`) hasta que existan las reglas del juego.
