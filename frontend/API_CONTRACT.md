# Contrato de API — frontend ↔ backend

El frontend (Next.js, `lib/api.ts`) ya está construido y llama a estos endpoints
sobre `NEXT_PUBLIC_BACKEND_URL` (`http://localhost:4000` en local). Ninguno existe
todavía en `backend/` (solo está `GET /health`). Esto es lo que hay que implementar
en el backend (NestJS) para que el frontend funcione de punta a punta.

Recordatorio de arquitectura (ver README raíz): el frontend **nunca** llama directo
a `blockchain-service` ni a `llm-service`. Todo pasa por el backend, que internamente
usa `BLOCKCHAIN_SERVICE_URL` y `LLM_SERVICE_URL`.

---

## Autenticación

### `POST /auth/login`
Body: `{ "email": string, "password": string }`

Respuesta 200:
```json
{ "institucion": { "id": "...", "nombre": "...", "email": "..." } }
```
Además, debe responder con `Set-Cookie: certchain_token=<jwt>; HttpOnly; Path=/; SameSite=Lax`.
Esa cookie es la que revisa `frontend/middleware.ts` para proteger `/dashboard` y `/certificados`.

Respuesta 401: `{ "message": "Credenciales inválidas" }`

### `POST /auth/logout`
Limpia la cookie `certchain_token` (`Set-Cookie` con `Max-Age=0`). Respuesta 204.

> El login del frontend usa `fetch(..., { credentials: 'include' })`, así que CORS en
> el backend debe permitir `credentials: true` y el origen `http://localhost:3000`.

---

## Emisión de certificados (protegido — requiere cookie válida)

### `POST /certificados/subir`
`multipart/form-data` con el campo `archivo` (PDF).

El backend guarda el archivo y devuelve los datos que se van a prellenar en el
formulario. Si todavía no hay extracción automática (OCR/parseo del PDF), está bien
devolver los campos vacíos para que la institución los llene a mano — lo importante
es el `subidaId` para el siguiente paso.

Respuesta 200/201:
```json
{
  "subidaId": "...",
  "nombreEstudiante": "",
  "carrera": "",
  "fechaEmision": "",
  "archivoNombre": "certificado.pdf"
}
```

### `POST /certificados`
Body:
```json
{ "subidaId": "...", "nombreEstudiante": "...", "carrera": "...", "fechaEmision": "2024-06-15" }
```

El backend genera el hash SHA-256 del documento y llama a `blockchain-service`
(`POST /certificados` en ese servicio) para registrarlo. Responde con el certificado
ya registrado:

```json
{
  "id": "...",
  "codigo": "UAX-2024-0847-MENG",
  "nombreEstudiante": "...",
  "carrera": "...",
  "fechaEmision": "2024-06-15",
  "institucion": "Universidad Autónoma de Xalapa",
  "hash": "0x...",
  "rfid": null,
  "estado": "registrado"
}
```

### `GET /certificados/recientes`
Respuesta 200 — usado en el sidebar de emisión y en el dashboard:
```json
[{ "codigo": "UAX-2024-0846", "nombreEstudiante": "Carlos Mendoza Ríos", "fecha": "10:42 AM" }]
```

### `GET /certificados/estadisticas`
Respuesta 200 — tarjetas del dashboard:
```json
{ "total": 128, "esteMes": 14, "pendientes": 2 }
```

---

## Verificación pública (sin autenticación)

### `GET /certificados/verificar?codigo=UAX-2024-0847-MENG`
Respuesta 200 si existe:
```json
{ "valido": true, "certificado": { "id": "...", "codigo": "...", "nombreEstudiante": "...", "carrera": "...", "fechaEmision": "...", "institucion": "...", "hash": "0x...", "rfid": "4F:8A:2C:1E", "estado": "registrado" } }
```
Respuesta 200 si no existe: `{ "valido": false }`

---

## Asistente (público, sobre un certificado ya verificado)

### `POST /chat`
Body: `{ "pregunta": "...", "codigoCertificado": "UAX-2024-0847-MENG" }`

El backend reenvía la pregunta a `llm-service` (`POST /chat` en ese servicio, que ya
existe como placeholder) junto con el contexto del certificado. Respuesta:
```json
{ "respuesta": "..." }
```

---

## Resumen para asignar

| Quién | Qué necesita construir |
|---|---|
| **Backend (NestJS)** | Los 7 endpoints de arriba: `/auth/login`, `/auth/logout`, `/certificados/subir`, `/certificados` (POST), `/certificados/recientes`, `/certificados/estadisticas`, `/certificados/verificar`, `/chat`. Incluye CORS con credentials y la cookie httpOnly del login. |
| **blockchain-service** | Ya tiene los stubs `POST /certificados` y `GET /certificados/:hash/verificar` (devuelven 501) — falta la integración real con el contrato (ya hay `blockchain-service/contracts`). El backend depende de esto para el paso de registro. |
| **llm-service** | Ya tiene el stub `POST /chat` — falta el RAG real. El backend solo reenvía la pregunta. |

El frontend ya maneja loading, error y estados vacíos para cada llamada, así que en
cuanto un endpoint responda con esta forma, la pantalla correspondiente funciona sin
tocar nada más de UI.
