# Guía de integración — blockchain-service

Este documento es el **contrato** entre el `blockchain-service` y los demás servicios (`backend`, `frontend`). Si trabajás en la base de datos, el portal o la API principal, esto es lo que necesitás saber para conectarte.

> ⚠️ Regla de oro: **la blockchain guarda solo hashes, nunca datos personales.** Todo lo que sea nombre, carrera, PDF, etc. vive en Postgres (off-chain). La cadena solo ancla la prueba de integridad.

---

## 1. Modelo de datos

### 1.1 Qué vive DENTRO de la cadena (on-chain)

Lo maneja el `blockchain-service`; el backend **no** lo toca directamente.

**Contrato `AcademicCertificates`** — por cada certificado:

| Campo | Tipo | Descripción |
|---|---|---|
| `certHash` | `bytes32` | Hash final que ancla el certificado (ver §2) |
| `issuer` | `address` | Dirección de la universidad que lo firmó (`msg.sender`) |
| `issueTimestamp` | `uint256` | Sello de tiempo de emisión |
| `isRevoked` | `bool` | Estado de revocación |

**Contrato `TrustedIssuersRegistry`** — el registro de universidades autorizadas:

| Campo | Tipo | Descripción |
|---|---|---|
| `admin` | `address` | El ente regulador (único que da de alta/baja emisores) |
| `isTrustedIssuer` | `mapping(address => bool)` | Si una dirección puede emitir certificados |
| `issuerName` | `mapping(address => string)` | Nombre legible de la universidad |

### 1.2 Qué vive en Postgres (off-chain, lo maneja el backend)

Tabla `certificates` (TypeORM):

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` (PK) | clave interna |
| `certId` | `varchar` (único) | identificador público (se usa en `/verificar/:certId`) |
| `studentName` | `varchar` | nombre del estudiante (PII → off-chain) |
| `career` | `varchar` | carrera (PII → off-chain) |
| `university` | `varchar` | nombre legible de la institución |
| `issuanceDate` | `timestamp` | fecha de emisión |
| `pdfHash` | `char(66)` | `keccak256` de los bytes del PDF (`0x` + 64 hex) |
| `certHash` | `char(66)` (único) | **el hash on-chain**: puente DB ↔ cadena |
| `issuer` | `char(42)` | dirección de la universidad que firmó |
| `pdf` | `bytea` (o path) | el archivo en sí |
| `status` | `enum('pending','registered','revoked')` | ciclo de vida |
| `createdAt` / `updatedAt` | `timestamp` | auditoría |

**`certHash` es el único campo que relaciona una fila de Postgres con la cadena.** El resto son datos y metadatos off-chain.

---

## 2. Algoritmo canónico del hash (CRÍTICO)

El backend es el **único** que computa el hash. Debe ser determinista y reproducible en verificación.

```
pdfHash  = keccak256( bytes del PDF )

metadata canónica (orden de campos FIJO, sin espacios):
  { "certId", "studentName", "career", "university", "issuanceDate", "pdfHash" }

certHash = keccak256( JSON.stringify(metadata) )   // UTF-8, orden fijo
```

Reglas:

1. `pdfHash` se calcula sobre los bytes crudos del archivo (`ethers.id(bytes)` o `keccak256(bytes)`).
2. La metadata se serializa **siempre en ese orden exacto** de claves.
3. `issuanceDate` en un formato fijo (ISO 8601 UTC, ej. `2026-08-12T00:00:00Z`).
4. `certHash = ethers.id(jsonString)` (equivalente a `keccak256` de los bytes UTF-8).

Si **cualquier** campo de la metadata o el PDF cambia, el `certHash` cambia → la verificación on-chain falla. Eso es lo que hace el sistema anti-falsificación.

> Si implementás esto en TypeScript: `import { id, keccak256, toUtf8Bytes } from "ethers";` y usá `id(JSON.stringify(obj))`.

---

## 3. Contrato de API (qué manda y recibe cada servicio)

### 3.1 Emisión de certificado

```
frontend ──(multipart/form-data)──▶ backend  POST /certificates/emit
  campos: pdf (file), studentName, career, university, issuanceDate

backend:
  1. calcula pdfHash y certHash (§2)
  2. INSERT en Postgres (status = "pending")
  3. responde → frontend: { certId, certHash }

frontend ──(firma con MetaMask)──▶ anvil: registerCertificate(certHash)
  (el usuario confirma en su wallet; msg.sender = dirección de la universidad)

frontend ──▶ backend  PATCH /certificates/:certId  { status: "registered", txHash }
```

### 3.2 Verificación (público)

```
frontend ──▶ backend  GET /certificates/:certId/verify

backend:
  1. SELECT metadata en Postgres por certId
  2. recomputa certHash (§2)
  3. llama al blockchain-service → POST /verifyCertificate { certHash }
  4. valida: exists && !isRevoked && issuer es confiable && certHash coincide

respuesta → frontend:
  { ok, valid, issuer, issuerName, issueTimestamp, isRevoked, metadata }
```

### 3.3 Revocación (solo la universidad dueña)

```
frontend ──(firma con MetaMask)──▶ anvil: revokeCertificate(certHash)
  (solo revierte si msg.sender == issuer original)

frontend ──▶ backend  PATCH /certificates/:certId  { status: "revoked" }
```

### 3.4 Alta de universidad (ente regulador)

```
regulador ──▶ blockchain-service  POST /addIssuer { address, name }
  (firmado server-side con la cuenta admin; agrega la dirección al registry)
```

---

## 4. Superficie del `blockchain-service` (endpoints)

| Endpoint | Método | Quién | Rol |
|---|---|---|---|
| `/config` | `GET` | backend / frontend | devuelve direcciones + ABI + `chainId` (no hardcodees nada) |
| `/verifyCertificate` | `POST` | backend | verificación (view, sin gas) |
| `/registerCertificate` | `POST` | *(legacy)* | fallback de desarrollo firmado por el server |
| `/addIssuer` | `POST` | regulador | alta de universidad |
| `/removeIssuer` | `POST` | regulador | baja de universidad |
| `/isTrustedIssuer` | `POST` | backend | consulta si una dirección es confiable |

### `GET /config` — respuesta

```json
{
  "chainId": "31337",
  "certificates": { "address": "0x...", "abi": [ ... ] },
  "registry": { "address": "0x...", "abi": [ ... ] }
}
```

**Importante**: obtené direcciones y ABI de acá, no de constantes. Si se redeploya la cadena, solo cambia este endpoint.

### `POST /verifyCertificate` — request/response

```json
// request
{ "certHash": "0x..." }

// response
{ "ok": true, "exists": true, "issuer": "0x...", "issueTimestamp": "1786...", "isRevoked": false, "valid": true }
```

---

## 5. Flujo de firma multi-universidad

```
                        ┌──────────────────────────────┐
   ente regulador       │   TrustedIssuersRegistry     │
   (cuenta 0, server) ──▶  addIssuer(0xUNI-A, "UVA")   │
                        │  addIssuer(0xUNI-B, "UNA")   │
                        └──────────────────────────────┘
                                     ▲
                                     │ isTrustedIssuer(msg.sender)
   universidad A (MetaMask) ──registerCertificate──▶ AcademicCertificates
   universidad B (MetaMask) ──registerCertificate──▶ AcademicCertificates
```

1. El regulador da de alta la **dirección** de cada universidad (`/addIssuer`). Esa dirección es la wallet (MetaMask) de la institución.
2. Cada universidad firma sus propias transacciones desde el portal con su wallet.
3. El contrato valida `isTrustedIssuer(msg.sender)` → la cadena decide quién puede emitir, no el server.

---

## 6. Configuración por servicio (variables de entorno)

| Servicio | Variable | Valor |
|---|---|---|
| `frontend` | `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:4000` |
| `frontend` | `NEXT_PUBLIC_RPC_URL` | `http://localhost:8545` (para firmar con MetaMask) |
| `backend` | `BLOCKCHAIN_SERVICE_URL` | `http://blockchain-service:6000` |
| `backend` | `DATABASE_URL` | conexión a Postgres |
| `blockchain-service` | `RPC_URL` | `http://anvil:8545` |
| `blockchain-service` | `ADMIN_PRIVATE_KEY` | cuenta 0 (regulador) |

> Recordá: `http://blockchain-service:6000` solo se resuelve **dentro** de la red Docker. Desde el navegador usá `http://localhost:6000`.
