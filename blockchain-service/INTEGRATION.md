# Guía de integración — blockchain-service

Este documento es el **contrato** entre el `blockchain-service` y los demás servicios (`backend`, `frontend`). Si trabajás en la base de datos, el portal o la API principal, esto es lo que necesitás saber para conectarte.

> ⚠️ Regla de oro: **la blockchain guarda solo hashes, nunca datos personales.** La metadata (nombre, carrera, etc.) vive en Postgres (off-chain). El **PDF no se guarda en ningún lado** del sistema: solo se conserva su `pdfHash`. La cadena ancla la prueba de integridad.

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
| `certId` | `varchar` (único) | identificador público legible del certificado |
| `universityId` | `uuid` (FK → `universities`) | referencia a la universidad emisora (su address vive en esa tabla) |
| `studentName` | `varchar` | nombre del estudiante (PII → off-chain) |
| `career` | `varchar` | carrera (PII → off-chain) |
| `issuanceDate` | `timestamp` | fecha de emisión |
| `pdfHash` | `char(66)` | `keccak256` de los bytes del PDF (`0x` + 64 hex) |
| `certHash` | `char(66)` (único) | **el hash on-chain**: puente DB ↔ cadena |
| `createdAt` / `updatedAt` | `timestamp` | auditoría |

**`certHash` es el único campo que relaciona una fila de Postgres con la cadena.**

La tabla `universities` (ya existente) concentra la identidad de cada institución, incluida su dirección pública; `certificates` solo la referencia por FK.

---

## 2. Algoritmo del hash (cómo se genera el certHash)

El backend es el **único** que computa el `certHash`, **una sola vez, en el momento de la emisión**. Ese `certHash` es el que viaja a la cadena, a la base de datos y a la **tarjeta/sticker NFC/RFID**. Después **no se recomputa**: la verificación consiste en leer el `certHash` del sticker y consultarlo en la cadena.

```
pdfHash  = keccak256( bytes del PDF )

metadata canónica (orden de campos FIJO, sin espacios):
  { "certId", "studentName", "career", "university", "issuanceDate", "pdfHash" }

certHash = keccak256( JSON.stringify(metadata) )   // UTF-8, orden fijo
```

Reglas:

1. `pdfHash` se calcula sobre los bytes crudos del archivo (`ethers.id(bytes)` o `keccak256(bytes)`).
2. La metadata se serializa **siempre en ese orden exacto** de claves. El campo `university` es el nombre de la institución, que el backend obtiene de la tabla `universities` (vía `universityId`).
3. `issuanceDate` en un formato fijo (ISO 8601 UTC, ej. `2026-08-12T00:00:00Z`).
4. `certHash = ethers.id(jsonString)` (equivalente a `keccak256` de los bytes UTF-8).

> Si implementás esto en TypeScript: `import { id } from "ethers";` y usá `id(JSON.stringify(obj))`.

---

## 3. Contrato de API (qué manda y recibe cada servicio)

### 3.1 Emisión de certificado

```
frontend ──(multipart/form-data)──▶ backend  POST /certificates/emit
  campos: pdf (file, solo para calcular su hash; NO se guarda),
          studentName, career, university, issuanceDate

backend:
  1. calcula pdfHash y certHash (§2)
  2. INSERT en Postgres (solo metadata, sin PDF)
  3. responde → frontend: { certId, certHash }

frontend ──(firma con MetaMask)──▶ anvil: registerCertificate(certHash)
  (el usuario confirma en su wallet; msg.sender = dirección de la universidad)

Ese mismo certHash es el que se graba en la tarjeta/sticker NFC/RFID del título.
```

### 3.2 Verificación (público)

El `certHash` viaja grabado en una **tarjeta/sticker NFC/RFID**. Verificar es leer ese `certHash` y consultarlo en la cadena; no se recomputa nada:

```
celular / prototipo ──(NFC/RFID)──▶ lee certHash de la tarjeta

celular ──▶ backend  POST /certificates/verify { certHash }

backend:
  1. llama al blockchain-service → POST /verifyCertificate { certHash }
  2. (opcional) busca metadata en Postgres por certHash para mostrar nombre/carrera/fecha

respuesta → frontend:
  { ok, valid, issuer, issuerName, issueTimestamp, isRevoked, metadata }
```

`valid = exists && !isRevoked`: el `certHash` existe en la cadena y no fue revocado.

### 3.3 Revocación (solo la universidad dueña)

```
frontend ──(firma con MetaMask)──▶ anvil: revokeCertificate(certHash)
  (solo revierte si msg.sender == issuer original)
```

La revocación queda **on-chain** (`isRevoked = true`); el backend no guarda estado, lo lee de la cadena al verificar.

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
