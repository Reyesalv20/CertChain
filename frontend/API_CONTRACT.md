# Contrato de API — frontend ↔ backend

El frontend (Next.js, `lib/api.ts`) ya está construido y llama a estos endpoints
sobre `NEXT_PUBLIC_BACKEND_URL` (`http://localhost:4000` en local). Ninguno existe
todavía en `backend/` (solo está `GET /health`). Esto es lo que hay que implementar
en el backend (NestJS) para que el frontend funcione de punta a punta.

Recordatorio de arquitectura (ver README raíz): el frontend llama al `backend` para
todo lo que es datos/negocio (login, certificados, chat). La **única excepción** es la
configuración de los contratos: para firmar con MetaMask, el frontend hace fetch
directo a `blockchain-service GET /config` (dirección + ABI), vía
`NEXT_PUBLIC_BLOCKCHAIN_SERVICE_URL`.

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

## Emisión de certificados (protegido)

El flujo de emisión ahora es **firma en cliente**: el backend **ya no** firma la
transacción de blockchain — la firma la institución desde el navegador con MetaMask.
El backend solo (1) procesa el PDF y calcula el hash, y (2) persiste la metadata una
vez que la firma quedó confirmada on-chain.

### 1. `POST /certificados/procesar`
`multipart/form-data` con el campo `archivo` (PDF).

El backend guarda el archivo, extrae (o mockea) la metadata y calcula el hash del
certificado. **No escribe nada en la blockchain ni en la DB todavía** — solo devuelve
los datos para prellenar el formulario y el `hash` que el frontend va a firmar.

Respuesta 200/201:
```json
{
  "subidaId": "...",
  "hash": "0x...",
  "nombreEstudiante": "",
  "carrera": "",
  "fechaEmision": "",
  "archivoNombre": "certificado.pdf"
}
```

> El `hash` es **mock** por ahora; después será el real (keccak256 de metadata + PDF,
> ver `blockchain-service/INTEGRATION.md`).

### 2. Firma en cliente (no es un endpoint)

El frontend llama a `registerCertificate(hash)` del contrato `AcademicCertificates`
firmando con la wallet de la institución (MetaMask). El contrato valida on-chain que
`msg.sender` sea un emisor confiable. El frontend obtiene la dirección + ABI desde
`blockchain-service GET /config`.

### 3. `POST /certificados/confirmar`
Body:
```json
{
  "subidaId": "...",
  "hash": "0x...",
  "txHash": "0x...",
  "nombreEstudiante": "...",
  "carrera": "...",
  "fechaEmision": "2024-06-15",
  "archivoNombre": "certificado.pdf"
}
```

El backend **verifica** que la transacción exista on-chain (llamando a
`blockchain-service POST /verifyCertificate { certHash }`) y recién entonces persiste
la metadata + hash en la DB. Responde con el certificado persistido:
```json
{
  "id": "...",
  "codigo": "UAX-2024-0847-MENG",
  "nombreEstudiante": "...",
  "carrera": "...",
  "fechaEmision": "2024-06-15",
  "institucion": "Universidad Autónoma de Xalapa",
  "hash": "0x...",
  "txHash": "0x...",
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
| **Backend (NestJS)** | Los endpoints: `/auth/login`, `/auth/logout`, `/certificados/procesar`, `/certificados/confirmar`, `/certificados/recientes`, `/certificados/estadisticas`, `/certificados/verificar`, `/chat`. En `/confirmar`, verifica on-chain (vía `blockchain-service`) antes de persistir. |
| **blockchain-service** | Ya expone `GET /config` (dirección + ABI, para que el frontend firme) y `POST /verifyCertificate` (para que el backend confirme). |
| **llm-service** | Ya tiene el stub `POST /chat` — falta el RAG real. El backend solo reenvía la pregunta. |

El frontend ya maneja loading, error y estados vacíos para cada llamada, así que en
cuanto un endpoint responda con esta forma, la pantalla correspondiente funciona sin
tocar nada más de UI.
