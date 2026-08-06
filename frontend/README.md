# frontend — Next.js (puerto 3000)

Portal web con dos secciones separadas mediante **Route Groups** de App Router:

- `app/(publico)/` — sin autenticación. Rutas: `/` (home), `/verificar`, `/login`.
- `app/(institucional)/` — requiere sesión. Rutas: `/dashboard`, `/certificados`.

Los paréntesis en `(publico)` e `(institucional)` son *route groups*: organizan carpetas sin agregar segmento a la URL. Por eso `app/(publico)/verificar/page.tsx` se sirve en `/verificar`, no en `/publico/verificar`.

## Cómo levantarlo

Solo este servicio (útil si estás trabajando puramente en UI y usas mocks):

```bash
docker compose up frontend
```

Esto también levanta `backend` (y sus dependencias) porque `frontend` depende de él en `docker-compose.yml`. Si quieres frontend 100% aislado, comenta temporalmente el bloque `depends_on` de `frontend` en el `docker-compose.yml` de la raíz.

Acceso: http://localhost:3000

## Autenticación institucional

`middleware.ts` (raíz de `frontend/`) intercepta las rutas listadas en `INSTITUCIONAL_PATHS` (`/dashboard`, `/certificados`). Si no existe la cookie `certchain_token`, redirige a `/login`.

Esto es un **placeholder**: no valida JWT, ni expiración, ni roles todavía. Cuando el backend tenga login real, este middleware debe:

1. Validar el token contra el backend (o verificar firma JWT localmente).
2. Manejar expiración/roles si aplica.

Si agregas una página nueva dentro de `app/(institucional)/...`, agrega su ruta al arreglo `INSTITUCIONAL_PATHS` en `middleware.ts` y al `matcher` de `config`.

## Comunicación con el backend

- Desde el **navegador** (componentes cliente, `fetch` en el browser): usa `process.env.NEXT_PUBLIC_BACKEND_URL` → `http://localhost:4000`.
- Desde el **servidor** (Server Components, Route Handlers, `generateMetadata`, etc. que corren dentro del contenedor): usa `process.env.BACKEND_INTERNAL_URL` → `http://backend:4000`.

No mezclar: `http://backend:4000` solo es resoluble dentro de la red de Docker, nunca desde el navegador del usuario.

## Estructura

```
frontend/
├── app/
│   ├── layout.tsx              → layout raíz (html/body)
│   ├── globals.css
│   ├── (publico)/
│   │   ├── layout.tsx          → nav pública
│   │   ├── page.tsx            → "/"
│   │   ├── verificar/page.tsx  → "/verificar"
│   │   └── login/page.tsx      → "/login"
│   └── (institucional)/
│       ├── layout.tsx          → nav institucional
│       ├── dashboard/page.tsx      → "/dashboard"
│       └── certificados/page.tsx   → "/certificados"
├── middleware.ts                → protección de rutas institucionales
├── next.config.js
├── package.json
└── Dockerfile
```

## Desarrollo local sin Docker (opcional)

```bash
cd frontend
npm install
npm run dev
```
