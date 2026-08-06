# backend — NestJS (puerto 4000)

API principal. Orquesta las llamadas a `blockchain-service` y `llm-service`, y es el punto de contacto del `frontend`.

## Cómo levantarlo

```bash
# Solo backend + sus dependencias (blockchain-service, llm-service, ollama)
docker compose up backend
```

No levanta `frontend`. Acceso: http://localhost:4000/health

## Estructura actual (placeholder)

```
backend/
├── src/
│   ├── main.ts            → bootstrap de Nest, escucha en 0.0.0.0:4000
│   ├── app.module.ts       → módulo raíz
│   ├── app.controller.ts   → GET /health
│   └── app.service.ts      → lógica del health check
├── nest-cli.json
├── tsconfig.json
├── package.json
└── Dockerfile
```

Solo existe el endpoint `GET /health` para confirmar que el contenedor y las variables de entorno funcionan. A partir de aquí se agregan los módulos reales (auth, certificados, usuarios, etc.) siguiendo la convención de Nest: `nest g module certificados`, `nest g controller certificados`, etc.

## Variables de entorno (ya configuradas en docker-compose.yml)

- `PORT=4000`
- `LLM_SERVICE_URL=http://llm-service:5000` — llamar por nombre de servicio, no `localhost`.
- `BLOCKCHAIN_SERVICE_URL=http://blockchain-service:6000` — ídem.

Ejemplo para llamar a otro servicio desde un controller/service de Nest:

```ts
const res = await fetch(`${process.env.BLOCKCHAIN_SERVICE_URL}/certificados/${hash}/verificar`);
```

## Próximos pasos sugeridos

1. Módulo de autenticación (JWT) — usado luego por el middleware de `frontend`.
2. Módulo de certificados: crear, listar, y delegar emisión/verificación a `blockchain-service`.
3. Endpoint que el `frontend` (institucional) consuma para el dashboard.
4. Conectar con `llm-service` para exponer el chat/asistente al frontend.

## Desarrollo local sin Docker (opcional)

```bash
cd backend
npm install
npm run start:dev
```
