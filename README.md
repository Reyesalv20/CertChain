# CertChain

Plataforma de **certificación académica anti-falsificación** basada en blockchain, con emisión/verificación de certificados, integración con RFID/Arduino y un asistente con IA (RAG).

Proyecto de la clase **Aplicaciones de Vanguardia** — equipo de 4 personas.

## Arquitectura

Microservicios independientes en contenedores Docker. Si un servicio se cae, no tumba a los demás.

```
┌──────────────┐      ┌──────────────┐      ┌────────────────────┐
│  frontend    │─────▶│  backend     │─────▶│  blockchain-service │
│  Next.js     │      │  NestJS      │      │  (Node/Express)     │
│  :3000       │      │  :4000       │      │  :6000              │
└──────────────┘      └──────┬───────┘      └────────────────────┘
                              │
                              ▼
                       ┌──────────────┐      ┌──────────────┐
                       │  llm-service │─────▶│  ollama      │
                       │  FastAPI     │      │  :11434      │
                       │  :5000       │      └──────────────┘
                       └──────────────┘
```

Los contenedores se comunican entre sí **por nombre de servicio** (ej. `http://backend:4000`), no por `localhost`. `localhost` dentro de un contenedor solo apunta a sí mismo.

## Servicios

| Servicio | Puertos | Tecnología | Descripción |
|---|---|---|---|
| `frontend` | `3000` | Next.js (App Router) | Portal institucional (emisión de certificados) y verificación pública |
| `backend` | `4000` | NestJS | API principal: auth, procesar PDF (OCR), confirmar y metadata de certificados |
| `blockchain-service` | `6000` (API) · `8545` (anvil) | Express + Foundry | API sobre los smart contracts (`/config`, `/verifyCertificate`) y blockchain local efímera (`anvil`) |
| `llm-service` | `5000` | Python / FastAPI | Asistente con RAG sobre los certificados |
| `ollama` | `11434` | Ollama | Motor de modelos local (usa `llm-service`) |

## Requisitos

- **Docker** y **Docker Compose v2** (`docker compose version`).
- **Git** para clonar el repositorio.
- **Node.js 22+** — solo si vas a correr algún servicio en desarrollo local sin Docker (`npm run dev`). El backend **requiere Node 22+** porque `@supabase/supabase-js` necesita el WebSocket nativo (en Docker esto ya se resuelve con la imagen correcta).
- **Supabase** — el proyecto usa Supabase para auth y como base de datos. Necesitás las credenciales (URL y keys). Las del proyecto del equipo ya vienen en `.env.example`; completá la que falta (service role key, que es secreta y no se commitea).

> Para desarrollo **sin Docker**, cada carpeta de servicio tiene su propio `README.md` con las instrucciones específicas y su `.env.example`.

## Levantar el proyecto

```bash
git clone https://github.com/Reyesalv20/CertChain.git
cd CertChain

# 1. Variables de entorno (completá la SUPABASE_SERVICE_ROLE_KEY, es secreta)
cp .env.example .env

# 2. Levantar todo
docker compose up -d --build
```

Esto levanta todos los servicios. Accesos:

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend (health) | http://localhost:4000/health |
| Blockchain API | http://localhost:6000/config |
| Blockchain RPC (anvil) | http://localhost:8545 |
| LLM service (health) | http://localhost:5000/health |
| Ollama | http://localhost:11434 |

Para apagar todo: `docker compose down` (agregá `-v` si además querés borrar el volumen de modelos de Ollama y el volumen de la cadena).

> ⚠️ **anvil es efímero** (la cadena vive en memoria). Si se cae o lo reiniciás sin que `deploy` vuelva a correr, las direcciones de los contratos quedan viejas. Regla de oro: `docker compose down -v` y volvé a levantar.

## Levantar solo un servicio

Cada servicio tiene su propio `docker-compose.yml` (un módulo), y el de la raíz los **incluye** a todos (`include:`). Por eso podés levantar lo que necesites de dos formas.

### Desde la raíz (todo en un solo proyecto)

```bash
docker compose up -d frontend
docker compose up -d backend
docker compose up -d blockchain-server   # levanta anvil + deploy + blockchain-server
docker compose up -d llm-service
```

### Desde la carpeta de cada servicio (standalone)

Todos comparten la red `certchain-network` (nombre fijo), así que se comunican aunque los levantes por separado:

```bash
cd blockchain-service && docker compose up -d   # anvil + deploy + blockchain-server
cd frontend && docker compose up -d
cd backend && docker compose up -d
cd llm-service && docker compose up -d
```

### Desarrollo híbrido (recomendado)

Levantar backend y blockchain en Docker, y correr el frontend en desarrollo local con hot-reload:

```bash
# 1. Blockchain (anvil + deploy + blockchain-server)
cd blockchain-service && docker compose up -d

# 2. Backend
cd backend && docker compose up -d

# 3. Frontend en local (Node 22+)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Esto funciona porque los puertos `4000`, `6000` y `8545` están expuestos al host: el navegador (frontend local) alcanza el backend en `localhost:4000`, y el rewrite de `next.config.js` envía `/blockchain/*` a `localhost:6000`. El backend (docker) se comunica con el blockchain por nombre de servicio (`blockchain-server`, `anvil`) dentro de la red compartida.

> Nota: el API del blockchain se llama **`blockchain-server`** dentro de Docker (no `server`). El backend lo referencia como `http://blockchain-server:6000`.
>
> `depends_on` controla el **orden de arranque**, no espera a que el servicio esté "listo". Si uno falla por timing al inicio, reinícialo con `docker compose restart <servicio>`.

## Estructura del repo

```
CertChain/
├── frontend/            → Next.js (portal). Dockerfile · docker-compose.yml · .env.example
├── backend/             → NestJS (API). Dockerfile · docker-compose.yml · .env.example
├── blockchain-service/  → smart contracts (Foundry) + API Express + anvil. docker-compose.yml · .env.example
├── llm-service/         → FastAPI (RAG). Dockerfile · docker-compose.yml
├── ollama/              → notas del motor de modelos
├── docker-compose.yml   → orquesta los módulos (include) sobre la red compartida certchain-network
├── .env.example         → todas las variables del proyecto
└── README.md            → este archivo
```

Cada carpeta de servicio tiene su `README.md` con instrucciones específicas para ese servicio.

## Variables de entorno

> Regla general: las variables con prefijo **`NEXT_PUBLIC_`** se exponen al **navegador** (componentes cliente), así que apuntan a `localhost` (puertos expuestos al host). Las **demás** se usan entre contenedores y apuntan al **nombre del servicio** dentro de Docker (ej. `http://blockchain-server:6000`). No mezclar ambos casos: el navegador no puede resolver `http://backend:4000`.

### Supabase (requerido por frontend y backend)

| Variable | Dónde | Nota |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | frontend (browser) | URL del proyecto. Pública |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | frontend (browser) | Pública por diseño (segura en el navegador) |
| `SUPABASE_URL` | backend | Misma URL, lado servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | **SECRETA**. Nunca con prefijo `NEXT_PUBLIC_` |

### Frontend (Next.js)

| Variable | Nota |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | URL del backend que usa el navegador → `http://localhost:4000` |
| `NEXT_PUBLIC_BLOCKCHAIN_SERVICE_URL` | Base del rewrite `/blockchain/*` en `next.config.js` → `http://localhost:6000` |
| `BACKEND_INTERNAL_URL` | URL del backend para código server-side (SSR) → `http://backend:4000` |
| `NEXT_PUBLIC_SUPABASE_URL` / `...PUBLISHABLE_KEY` | ver Supabase |

### Backend (NestJS)

| Variable | Nota |
|---|---|
| `PORT` | puerto (4000) |
| `FRONTEND_ORIGIN` | CORS: orígenes permitidos → `http://localhost:3000` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | ver Supabase |
| `BLOCKCHAIN_SERVICE_URL` | API del blockchain dentro de Docker → `http://blockchain-server:6000` |
| `LLM_SERVICE_URL` | llm-service dentro de Docker → `http://llm-service:5000` |

### llm-service (FastAPI)

| Variable | Nota |
|---|---|
| `OLLAMA_URL` | → `http://ollama:11434` (o un túnel si Ollama corre en otra máquina) |
| `OLLAMA_MODEL_LLAMA3` / `OLLAMA_MODEL_MISTRAL` | modelos |
| `MOCK_CERTIFICADOS` | `true` mientras el endpoint de certificados no exista |

### blockchain-service

Las claves de anvil (cuenta de deploy, admin, emisor) están hardcodeadas en su `docker-compose.yml` **a propósito**: son claves públicas de desarrollo de una cadena local efímera. **Nunca** usar esas claves fuera de un entorno de prueba. Las direcciones de los contratos las escribe el `deploy` en el volumen compartido `shared` — no van en `.env`.
