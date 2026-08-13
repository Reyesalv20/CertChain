# blockchain-service (puerto 6000)

Microservicio que **emite, verifica y revoca certificados académicos** usando una blockchain. Guarda el hash de cada certificado en un smart contract y valida que solo **emisores confiables** (instituciones autorizadas por un ente regulador) puedan registrarlos.

> ⚠️ El PDF del título **no** se guarda en la blockchain. Se guarda su **hash** (bytes32), que permite probar que el documento existía en una fecha determinada y que no fue alterado, sin exponer el contenido.

> 📘 Si trabajás en el `backend` o `frontend` y necesitás conectarte a este servicio, leé **[`INTEGRATION.md`](./INTEGRATION.md)**: esquema de la base de datos, contrato de API y flujo de firma multi-universidad.

---

## Índice

1. [Arquitectura y cómo se conecta todo](#arquitectura-y-cómo-se-conecta-todo)
2. [Los smart contracts](#los-smart-contracts)
3. [La API (endpoints)](#la-api-endpoints)
4. [Flujo completo de la blockchain](#flujo-completo-de-la-blockchain)
5. [Probar con Docker + curl](#probar-con-docker--curl)
6. [Probar con Postman](#probar-con-postman)
7. [Entorno de desarrollo SIN Docker](#entorno-de-desarrollo-sin-docker)
8. [Cositas importantes (lo aprendido a las piñas)](#cositas-importantes-lo-aprendido-a-las-piñas)

---

## Arquitectura y cómo se conecta todo

```
┌──────────────────────────────────────────────────────────────────┐
│  Contenedores Docker (docker-compose.yml)                        │
│                                                                  │
│  ┌──────────┐   1. deploy    ┌──────────┐   2. leer direcciones  │
│  │  anvil   │◄───────────────│  deploy  │───────────────────────┐│
│  │ (cadena) │  (cuenta 0)    │ (una vez)│  escribe /shared      ││
│  └────┬─────┘                └──────────┘                      ││
│       │ RPC (8545)                                             ││
│  ┌────▼─────────────┐   tx firmada    ┌─────────────────────┐  ││
│  │  universidades   │◄────────────────│  blockchain-service │◄─┘│
│  │  (firman con su  │   (MetaMask)    │  Express API :6000  │   │
│  │   wallet)        │                 │  + fallback de firma │   │
│  └──────────────────┘                 └─────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

Los **roles** (la clave de todo el diseño):

| Rol | Quién es | Cuenta | Qué hace |
|---|---|---|---|
| **Ente regulador** | backoffice del gobierno | cuenta 0 (`0xf39F...`) | Despliega los contratos y da de alta/baja a las universidades (`/addIssuer`, `/removeIssuer`) |
| **Universidad (emisor)** | cada institución | su propia wallet (MetaMask) | Firma sus certificados (`registerCertificate`) y revocaciones (`revokeCertificate`) |
| **Server (fallback)** | el `blockchain-service` | cuenta 1 (`0x7099...`) | Firma `/registerCertificate` solo como fallback de desarrollo |

La **conexión entre contratos** es on-chain: `AcademicCertificates` guarda la dirección de `TrustedIssuersRegistry` (fijada en su constructor) y le pregunta, en cada `registerCertificate`, si quien firma es un emisor confiable:

```solidity
require(trustedRegistry.isTrustedIssuer(msg.sender), "Emisor no autorizado");
```

Por eso, aunque alguien llame al contrato directamente con `cast` (saltándose el server), igual queda bloqueado. La validación vive en la cadena, no en Node.

---

## Los smart contracts

Ambos están en `contracts/src/`.

### 1. `TrustedIssuersRegistry` (`TrustedIssuersRegistry.sol`)

Es el **registro de emisores confiables**, administrado por el ente regulador.

**Qué guarda en la blockchain:**

| Estado | Tipo | Descripción |
|---|---|---|
| `admin` | `address` | El que desplegó el contrato (`msg.sender` del constructor). Único con permisos. |
| `isTrustedIssuer` | `mapping(address => bool)` | Quién está autorizado a emitir certificados. |
| `issuerName` | `mapping(address => string)` | Nombre legible de cada emisor (ej. "Universidad de Vanguardia"). |

**Funciones:**

| Función | Visibilidad | Quién | Qué hace |
|---|---|---|---|
| `addIssuer(address _issuer, string _name)` | `external` | solo `admin` | Marca `_issuer` como confiable y guarda su nombre. |
| `removeIssuer(address _issuer)` | `external` | solo `admin` | Quita a `_issuer` de la lista y borra su nombre. |

**Eventos:** `IssuerAdded(address indexed issuer, string name)`, `IssuerRemoved(address indexed issuer)`.

### 2. `AcademicCertificates` (`CertificateRegistry.sol`)

Es el **registro de certificados emitidos**. Guarda el hash y su estado, y valida que el emisor sea confiable.

**Qué guarda en la blockchain:**

| Estado | Tipo | Descripción |
|---|---|---|
| `trustedRegistry` | `ITrustedIssuersRegistry` (`immutable`) | Referencia al contrato de emisores, fijada una vez en el constructor. |
| `certificates` | `mapping(bytes32 => Certificate)` | El registro propiamente dicho, indexado por hash. |

Cada `Certificate` es un struct:

| Campo | Tipo | Descripción |
|---|---|---|
| `certHash` | `bytes32` | Hash SHA-256 del PDF + metadata. |
| `issuer` | `address` | Wallet de la universidad que lo emitió. |
| `issueTimestamp` | `uint256` | Fecha/hora Unix de emisión (sirve como sello de tiempo). |
| `isRevoked` | `bool` | Estado de revocación (false por defecto). |

**Funciones:**

| Función | Visibilidad | Quién | Qué hace |
|---|---|---|---|
| `registerCertificate(bytes32 _certHash)` | `external` | solo emisor confiable | Guarda el certificado. Revierte si el firmante no está en el registry o si el hash ya existe. |
| `verifyCertificate(bytes32 _certHash)` | `external view` | cualquiera | Devuelve `(exists, issuer, issueTimestamp, isRevoked)`. Lectura gratis, sin gas. |
| `revokeCertificate(bytes32 _certHash)` | `external` | solo el emisor original | Marca `isRevoked = true` (fraude académico). |

**Eventos:** `CertificateRegistered(bytes32 indexed certHash, address indexed issuer, uint256 timestamp)`, `CertificateRevoked(bytes32 indexed certHash, address indexed issuer)`.

> Nota de diseño: `AcademicCertificates` no importa el contrato concreto de `TrustedIssuersRegistry`, sino una `interface` (`ITrustedIssuersRegistry`) que declara solo la función que necesita. Es el patrón de **segregación de interfaces**: menor acoplamiento y más fácil de testear.

---

## La API (endpoints)

Todos los endpoints son `POST` y reciben JSON, salvo `/config` (GET). El server (`server.js`) usa `ethers.js` y tiene **dos wallets**: la del emisor (cuenta 1) y la del admin (cuenta 0).

| Endpoint | Body | Contrato | Wallet | Respuesta OK |
|---|---|---|---|---|
| `GET /config` | — | — | — | `{chainId, certificates:{address,abi}, registry:{address,abi}}` |
| `POST /registerCertificate` *(legacy)* | `{"certHash": "0x..."}` | `AcademicCertificates` | emisor | `{ok, txHash, blockNumber}` |
| `POST /verifyCertificate` | `{"certHash": "0x..."}` | `AcademicCertificates` | — (view) | `{ok, exists, issuer, issueTimestamp, isRevoked, valid}` |
| `POST /addIssuer` | `{"address": "0x...", "name": "..."}` | `TrustedIssuersRegistry` | admin | `{ok, txHash, blockNumber}` |
| `POST /removeIssuer` | `{"address": "0x..."}` | `TrustedIssuersRegistry` | admin | `{ok, txHash, blockNumber}` |
| `POST /isTrustedIssuer` | `{"address": "0x..."}` | `TrustedIssuersRegistry` | — (view) | `{ok, trusted, name}` |

> `POST /registerCertificate` firma con la cuenta del server. Es un **fallback de desarrollo**: el flujo real es que cada universidad firma en el cliente (MetaMask). Ver `INTEGRATION.md`.

**Códigos de error:**

| Código | Cuándo |
|---|---|
| `400` | hash o address inválido |
| `403` | la tx revirtió por permisos (ej. "Emisor no autorizado") |
| `500` | cualquier otro error |

---

## Flujo completo de la blockchain

Secuencia de despliegue (la ejecuta `deploy.sh`, una sola vez):

```
1. deploy TrustedIssuersRegistry      → admin = cuenta 0 (ente regulador)
2. deploy AcademicCertificates(addr)  → guarda la referencia al registry
3. admin → addIssuer(cuenta 1, "Universidad de Vanguardia")   ← emisor de test (fallback)
4. guardar ambas direcciones en /shared  (el server las lee de ahí)
```

En runtime hay **dos caminos de firma**:

**A) Firma en el cliente (el flujo real, multi-universidad):**

```
universidad (MetaMask) → registerCertificate(certHash)
  → msg.sender = su wallet
  → el contrato pregunta: ¿isTrustedIssuer(0xUNI...)?  → sí (la dio de alta el regulador)
  → guarda certificates[hash] = {issuer: 0xUNI..., timestamp, isRevoked: false}
```

Cada universidad tiene su propia wallet; el regulador la agrega al registry con `/addIssuer`. El server **no** firma por ellas.

**B) Firma en el server (fallback de desarrollo):**

```
POST /registerCertificate
  → server firma la tx con la cuenta 1 (emisor de test)
  → el contrato pregunta: ¿isTrustedIssuer(0x7099...)?  → sí
  → guarda certificates[hash] = {issuer: 0x7099..., timestamp, isRevoked: false}
  → responde txHash + blockNumber
```

**Verificación (común a ambos caminos):**

```
POST /verifyCertificate
  → el contrato lee certificates[hash] (sin gas, view)
  → devuelve exists=true, issuer, timestamp, isRevoked
  → el server agrega valid = exists && !isRevoked
```

El orden de despliegue **importa**: `AcademicCertificates` necesita la dirección del registry en su constructor, así que primero va el registry. El flujo end-to-end con backend y frontend está en `INTEGRATION.md`.

---

## Probar con Docker + curl

Hay **dos formas** de correrlo:

1. **Standalone** (solo este servicio): desde `blockchain-service/`, `docker compose up -d --build` usa el `docker-compose.yml` local (`anvil + deploy + server`).
2. **Desde el compose raíz** (integrado con el resto del stack): desde la raíz del repo, `docker compose up -d --build blockchain-service` usa el `docker-compose.yml` raíz, que trae `anvil + deploy + blockchain-service` (el `depends_on` levanta los dos primeros). No baja frontend/backend/llm.

> No corras ambos a la vez: comparten los puertos `8545` y `6000`.

### Levantar desde el compose raíz (paso a paso)

Paso a paso para probar el servicio levantado desde el `docker-compose.yml` de la **raíz del repo** (no desde `blockchain-service/`):

```bash
# 1. Levantar anvil + deploy + blockchain-service (el depends_on arranca los otros dos)
docker compose up -d --build blockchain-service

# 2. Ver que deploy terminó (esperá ver "List" al final: significa que escribió las direcciones)
docker compose logs -f deploy

# 3. Ver que el server está arriba (esperá "Server en http://localhost:6000")
docker compose logs -f blockchain-service
```

Ahora el servicio responde en `http://localhost:6000` y la cadena en `http://localhost:8545`:

```bash
# Config: devuelve direcciones + ABI + chainId (para que otros servicios no hardcodeen nada)
curl -s http://localhost:6000/config

# Registrar un certificado (fallback: firma el server con la cuenta emisora)
curl -s -X POST http://localhost:6000/registerCertificate \
  -H "Content-Type: application/json" \
  -d '{"certHash":"0x1111111111111111111111111111111111111111111111111111111111111111"}'

# Verificarlo
curl -s -X POST http://localhost:6000/verifyCertificate \
  -H "Content-Type: application/json" \
  -d '{"certHash":"0x1111111111111111111111111111111111111111111111111111111111111111"}'
```

Para apagar (con `-v` se borra la cadena efímera → la próxima vez redeploya desde cero):

```bash
docker compose down -v
```

> La colección de Postman (`blockchain-service.postman_collection.json`) funciona igual levantando desde la raíz: mismo puerto `6000`, mismos endpoints.

### Levantar el stack (standalone)

```bash
docker compose up -d --build    # primera vez
docker compose up -d            # las siguientes
```

Levanta 3 servicios:

| Servicio | Rol | Puerto |
|---|---|---|
| `anvil` | blockchain local efímera | `8545` |
| `deploy` | compila y despliega los 2 contratos (una vez) | — |
| `server` | API Express | `6000` |

### Registrar y verificar

```bash
# Registrar (el emisor confiable firma)
curl -X POST http://localhost:6000/registerCertificate \
  -H "Content-Type: application/json" \
  -d '{"certHash":"0x1111111111111111111111111111111111111111111111111111111111111111"}'

# Verificar
curl -X POST http://localhost:6000/verifyCertificate \
  -H "Content-Type: application/json" \
  -d '{"certHash":"0x1111111111111111111111111111111111111111111111111111111111111111"}'
```

### Endpoints de admin

```bash
# Consultar si una dirección es emisor confiable
curl -X POST http://localhost:6000/isTrustedIssuer \
  -H "Content-Type: application/json" \
  -d '{"address":"0x70997970C51812dc3A010C7d01b50e0d17dc79C8"}'

# Agregar un emisor nuevo (cuenta 2 de anvil)
curl -X POST http://localhost:6000/addIssuer \
  -H "Content-Type: application/json" \
  -d '{"address":"0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC","name":"Universidad Nacional"}'

# Eliminarlo
curl -X POST http://localhost:6000/removeIssuer \
  -H "Content-Type: application/json" \
  -d '{"address":"0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"}'
```

### Probar que la validación vive en la cadena (no en Node)

Un atacante con una cuenta que **no** es emisor intenta registrar directo en el contrato con `cast`:

```bash
cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 \
  "registerCertificate(bytes32)" \
  0x3333333333333333333333333333333333333333333333333333333333333333 \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

Resultado esperado: revert con `Emisor no autorizado`.

**Direcciones deterministas del stack (anvil):**

| Qué | Dirección |
|---|---|
| `TrustedIssuersRegistry` | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| `AcademicCertificates` | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| Admin (cuenta 0) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| Emisor / server (cuenta 1) | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |

### Logs y apagado

```bash
docker compose logs -f server    # también: deploy, anvil
docker compose down              # apaga (conserva el volumen)
docker compose down -v && docker compose up -d   # reinicio limpio ← REGLA DE ORO
```

---

## Probar con Postman

Hay una colección lista para importar: **`blockchain-service.postman_collection.json`**.

1. Abrí Postman → **Import** → elegí ese archivo.
2. La colección trae una variable `baseUrl` (default `http://localhost:6000`). Cambiala si tu server corre en otro puerto.
3. Corré las requests en orden sugerido:

| # | Request | Nota |
|---|---|---|
| 1 | `registerCertificate` | usá un hash válido (64 hex con `0x`) |
| 2 | `verifyCertificate` | debe devolver `"valid": true` |
| 3 | `isTrustedIssuer` | sobre la dirección del emisor (`0x7099...`) |
| 4 | `addIssuer` | agregá la cuenta 2 (`0x3C44...`) |
| 5 | `removeIssuer` | la quita de nuevo |

---

## Entorno de desarrollo SIN Docker

Requisitos: [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast, anvil) y Node.js 24+.

### 1. Levantar la blockchain local

```bash
anvil
```

Queda escuchando en `http://127.0.0.1:8545` con 10 cuentas de prueba (1.000 ETH cada una). La cuenta 0 firma los deploys.

### 2. Compilar y testear los contratos

```bash
cd contracts
forge build
forge test
```

- `forge build` genera los ABI en `contracts/out/`.
- `forge test` corre los 12 tests (registro aislado + integración entre los dos contratos).

### 3. Desplegar los dos contratos (en orden)

```bash
# 1) Registry
forge create src/TrustedIssuersRegistry.sol:TrustedIssuersRegistry \
  --broadcast \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# 2) Certificates (le pasás la dirección del registry)
forge create src/CertificateRegistry.sol:AcademicCertificates \
  --broadcast \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --constructor-args 0x5FbDB2315678afecb367f032d93F642f64180aa3

# 3) El admin aprueba al emisor (cuenta 1)
cast send 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "addIssuer(address,string)" \
  0x70997970C51812dc3A010C7d01b50e0d17dc79C8 "Universidad de Vanguardia" \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

> ⚠️ `--broadcast` es obligatorio en Foundry v1.7.1: sin él, `forge create` hace dry-run y no transmite nada.
>
> Como anvil es determinista, las direcciones serán `0x5FbD...aa3` (registry) y `0xe7f1...512` (certificates), siempre que la cuenta 0 no haya hecho otra transacción antes.

### 4. Configurar las variables de entorno

```bash
cp .env.example .env
```

El `.env` necesita (el server usa dos wallets):

```bash
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d   # cuenta 1 (emisor)
ADMIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  # cuenta 0 (admin)
CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
TRUSTED_ISSUERS_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
PORT=6000
```

### 5. Levantar el server

El server lee el ABI de `./out/`, pero forge lo genera en `contracts/out`. Creá un symlink (en Docker no hace falta, la imagen lo normaliza solo):

```bash
ln -sf contracts/out out
node --env-file=.env server.js
```

> ⚠️ `--env-file` es obligatorio: sin él, `process.env.PRIVATE_KEY` es `undefined` y el server falla con "invalid private key".

### 6. Probar

Los mismos curls de la sección [Probar con Docker + curl](#probar-con-docker--curl), pero contra `http://localhost:6000`.

---

## Cositas importantes (lo aprendido a las piñas)

1. **Regla de oro: `docker compose down -v && docker compose up -d`.** `anvil` es efímero (la cadena vive en memoria), `deploy` corre una sola vez, y el volumen `shared` (con las direcciones) persiste. Si anvil se reinicia sin que deploy vuelva a correr, el server queda apuntando a direcciones viejas. El `-v` borra el volumen y elimina el problema de raíz.

2. **El orden de despliegue importa.** `AcademicCertificates` exige la dirección del registry en su constructor, así que primero se despliega el registry.

3. **`node --env-file=.env server.js`**: sin ese flag no se cargan las variables y el server no arranca.

4. **`forge create --broadcast`**: sin `--broadcast`, Foundry v1.7.1 no transmite (dry-run).

5. **Funciones `view` ≠ transacciones.** `verifyCertificate` e `isTrustedIssuer` solo leen: no tienen `tx.wait()`, devuelven el valor directo. Solo las funciones que cambian estado (register/add/remove/revoke) generan transacción.

6. **El nonce y las transacciones rápidas.** Mandar varias tx seguidas con el mismo wallet puede chocar en el nonce ("nonce has already been used"). Solución: envolver el wallet en `ethers.NonceManager`.

7. **Las claves son de desarrollo**: las private keys de anvil están hardcodeadas a propósito (stack 100% local). Jamás usarlas fuera de un entorno de prueba.

8. **Firma en cliente sin tocar contratos.** El paso a firma multi-universidad (cada institución firma con MetaMask) no exigió cambios en los smart contracts: `msg.sender` ya es la wallet de quien firma, y el `require(isTrustedIssuer(msg.sender))` hace el resto. La clave es que el regulador dé de alta la dirección de cada universidad en el registry.
