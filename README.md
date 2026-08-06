# CertChain

Plataforma de certificación académica anti-falsificación con blockchain, RFID/Arduino y asistente LLM con RAG.

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

## Tabla de puertos y responsables

| Servicio             | Puerto  | Tecnología          | Responsable                  |
|-----------------------|---------|----------------------|-------------------------------|
| `frontend`            | 3000    | Next.js (App Router) | Persona 3 (infraestructura) — implementación UI: _completar_ |
| `backend`              | 4000    | NestJS               | _completar_ |
| `blockchain-service`   | 6000    | Node.js / Express    | _completar_ |
| `llm-service`          | 5000    | Python / FastAPI     | _completar_ (RAG + LLM) |
| `ollama`               | 11434   | Ollama (imagen oficial) | Compartido / infraestructura |

> Ajusten esta tabla con los nombres reales del equipo.

## Requisitos

- Docker y Docker Compose (`docker compose version` para confirmar).
- No hace falta instalar Node/Python en tu máquina: todo corre dentro de los contenedores.

## Levantar el proyecto completo

```bash
git clone https://github.com/Reyesalv20/CertChain.git
cd CertChain
cp .env.example .env   # opcional, los valores por defecto ya funcionan
docker compose up --build
```

Esto levanta los 5 servicios. Accesos:

- Frontend: http://localhost:3000
- Backend (health check): http://localhost:4000/health
- Blockchain service (health check): http://localhost:6000/health
- LLM service (health check): http://localhost:5000/health
- Ollama: http://localhost:11434

Para apagar todo: `docker compose down` (agrega `-v` si además quieres borrar el volumen de modelos de Ollama).

## Levantar SOLO tu servicio

Gracias a `depends_on` en `docker-compose.yml`, cada servicio arranca junto con lo mínimo que necesita para funcionar, sin encender el resto:

```bash
# Compañero de backend (arranca backend + blockchain-service + llm-service + ollama, NO frontend)
docker compose up backend

# Compañero de blockchain (arranca solo blockchain-service, sin dependencias)
docker compose up blockchain-service

# Compañero de LLM/RAG (arranca llm-service + ollama)
docker compose up llm-service

# Persona 3 / quien trabaje frontend (arranca todo, porque frontend depende de backend)
docker compose up frontend
```

También puedes ser explícito y nombrar varios servicios a mano:

```bash
docker compose up backend blockchain-service llm-service
```

> Nota: `depends_on` controla el **orden de arranque**, no espera a que el servicio esté "listo" (ej. que NestJS ya haya terminado de compilar). Si tu servicio depende de otro y falla al inicio por timing, reinícialo con `docker compose restart <servicio>`.

## Estructura del repo

```
CertChain/
├── frontend/            → Next.js — portal institucional y público (puerto 3000)
├── backend/              → NestJS — API principal (puerto 4000)
├── blockchain-service/   → Emisión/verificación en blockchain (puerto 6000)
├── llm-service/          → Asistente RAG (puerto 5000, placeholder)
├── ollama/               → Notas del servicio Ollama (puerto 11434)
├── docker-compose.yml    → Orquestación de los 5 servicios
├── .env.example          → Variables de entorno de referencia
└── README.md             → Este archivo
```

Cada carpeta de servicio tiene su propio `README.md` con instrucciones específicas para la persona responsable de esa parte.

## Variables de entorno importantes

- `NEXT_PUBLIC_BACKEND_URL`: la usa el **navegador** del usuario final → debe ser `http://localhost:4000`.
- `BACKEND_INTERNAL_URL`, `LLM_SERVICE_URL`, `BLOCKCHAIN_SERVICE_URL`, `OLLAMA_URL`: las usan los **contenedores entre sí** → usan el nombre del servicio (ej. `http://backend:4000`).

No mezclar ambos casos: código que corre en el navegador (componentes cliente) no puede resolver `http://backend:4000`.

## Estado del proyecto

- [x] Estructura de microservicios y Docker Compose
- [x] Next.js con rutas institucional/público separadas por middleware
- [ ] Lógica real de backend (NestJS)
- [ ] Integración real con blockchain
- [ ] Lógica real de RAG en `llm-service`
- [ ] Integración RFID/Arduino
