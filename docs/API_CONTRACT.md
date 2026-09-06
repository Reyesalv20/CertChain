# Contrato de API y plan de features — CertChain

> Fuente de verdad para trabajar en paralelo (backend / frontend) e integrar sin fricción.
> Si un endpoint o una tabla cambia, actualizá este archivo primero.

## Convenciones

- **Auth**: Supabase Auth (`auth.users`). El navegador loguea con Supabase y manda `Authorization: Bearer <JWT>`.
- El backend valida el JWT y resuelve el rol desde la tabla `usuarios`:
  - `rol = 'admin'` → no tiene institución.
  - `rol = 'institucional'` → tiene `institucion_id`.
- Niveles de acceso en las tablas de endpoints: **Público** (sin token) · **Inst** (token, institucional) · **Admin**.
- **Blockchain**: las operaciones on-chain las firma el **cliente** (panel de wallet). El backend **no** firma ni proxea transacciones; solo lee/guarda en Supabase.

---

## Modelo de datos (schema `mydb`)

`auth.users` (schema `auth`, de Supabase) **no se toca**: es el login (email/password → JWT). Las tablas de abajo lo referencian.

### Ya existentes

**`instituciones`**

| columna | tipo |
|---|---|
| `institucion_id` | int PK |
| `nombre` | text |
| `wallet_address` | text (legacy; migrar a `institucion_wallets`) |
| `auth_user_id` | uuid (legacy; migrar a `usuarios`) |

**`certificados`**

| columna | tipo |
|---|---|
| `id_certificado` | int PK |
| `codigo` | text UNIQUE |
| `nombre_estudiante` | text |
| `carrera` | text |
| `fecha_titulacion` | date |
| `hash_certificado` | text |
| `estado` | text (`registrado` / `revocado`) |
| `fecha_creacion` | timestamptz |
| `institucion_id` | int FK → instituciones |

### Nuevas

**`usuarios`** — perfil de la plataforma (extiende `auth.users`)

| columna | tipo |
|---|---|
| `usuario_id` | uuid PK |
| `auth_user_id` | uuid UNIQUE FK → `auth.users.id` |
| `rol` | text (`admin` \| `institucional`) |
| `institucion_id` | int NULL FK → instituciones (null si admin) |
| `nombre` | text |
| `email` | text |

**`institucion_wallets`** — varias wallets por institución

| columna | tipo |
|---|---|
| `wallet_id` | int PK |
| `institucion_id` | int FK → instituciones |
| `address` | text UNIQUE |
| `etiqueta` | text |

> Migración: `instituciones.auth_user_id` → se mueve a `usuarios`; `instituciones.wallet_address` → se mueve a `institucion_wallets` (una institución puede tener varias).

---

## Auth y creación de usuarios

- Login: Supabase client (frontend) → JWT → backend valida con `getUser(token)`.
- Guard de rol: después de `getUser`, buscar `usuarios` por `auth_user_id` y adjuntar `request.usuario = { usuario_id, rol, institucion_id, nombre }`.
- Crear usuario (solo admin): `supabase.auth.admin.createUser({ email, password })` (service role) → insert en `usuarios`.

---

## Panel de wallet (envuelve MetaMask — solo donde se firma)

Aparece en: **emitir certificado**, **revocar certificado**, **administrar wallets de una institución**.

Componente `WalletPanel` como **sidebar derecho**. Usa MetaMask como signer (todo pasa por `window.ethereum`); el panel es la UI de estado y de disparar las acciones — la confirmación final siempre es el popup de MetaMask.

1. **Conectar**: botón → `BrowserProvider(window.ethereum)` + `eth_requestAccounts`.
2. **Cuenta activa**: dirección, balance y red (chainId). Se actualiza con `accountsChanged` / `chainChanged`.
3. **Acciones de firma**: botones (emitir/revocar/agregar o quitar emisor) que llaman al contrato → abren el popup de MetaMask para confirmar.
4. Estado de la tx al confirmar (txHash, bloque).

### Funciones en `frontend/lib/wallet.ts` (nuevas)

| función | firma on-chain |
|---|---|
| `registrarCertificado(hash)` | `registerCertificate(hash)` (ya existe) |
| `revocarCertificado(hash)` | `revokeCertificate(hash)` |
| `agregarEmisor(address, nombre)` | `registry.addIssuer(address, nombre)` |
| `quitarEmisor(address)` | `registry.removeIssuer(address)` |

Todas siguen el patrón: `staticCall` → tx → `wait()`, con `formatearErrorFirma`.

---

## Endpoints del backend

### Certificados (Inst) y públicos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/certificados?estado=&buscar=` | Inst | Lista de certificados de mi institución (paginado + filtros) |
| GET | `/certificados/:id` | Inst | Detalle (metadata + hash + estado) |
| POST | `/certificados/procesar` | Inst | *(existe)* multipart PDF → OCR + hash |
| POST | `/certificados/confirmar` | Inst | *(existe)* persiste tras firmar on-chain |
| POST | `/certificados/:id/revocar` | Inst | marca `estado='revocado'` (tras firmar on-chain) |
| GET | `/certificados/recientes` | Inst | *(existe)* |
| GET | `/certificados/estadisticas` | Inst | *(existe)* |
| GET | `/certificados/verificar?codigo=` | Público | busca por código → devuelve `hash` + metadata |
| GET | `/certificados/metadata?hash=` | Público | metadata por hash (renombra `obtenerMetadataPorHash`) |

### Admin — certificados

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/admin/certificados?institucion_id=&estado=&buscar=` | Admin | Todos los certificados (filtros) |

### Admin — instituciones

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/admin/instituciones` | Admin | lista |
| POST | `/admin/instituciones` | Admin | crear institución |
| GET | `/admin/instituciones/:id` | Admin | detalle (nombre + contadores) |
| DELETE | `/admin/instituciones/:id` | Admin | eliminar |
| GET | `/admin/instituciones/:id/certificados` | Admin | certificados de la institución |
| GET | `/admin/instituciones/:id/wallets` | Admin | wallets (DB) |
| POST | `/admin/instituciones/:id/wallets` | Admin | guarda wallet (tras `agregarEmisor` on-chain) |
| DELETE | `/admin/instituciones/:id/wallets/:walletId` | Admin | borra wallet (tras `quitarEmisor` on-chain) |
| GET | `/admin/instituciones/:id/usuarios` | Admin | usuarios de la institución |

### Admin — usuarios

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/admin/usuarios` | Admin | lista (rol + institución) |
| POST | `/admin/usuarios` | Admin | crea auth (Supabase) + fila en `usuarios` |
| PATCH | `/admin/usuarios/:id` | Admin | cambia rol / institución |
| DELETE | `/admin/usuarios/:id` | Admin | elimina |

---

## Frontend: rutas y consumo

| Ruta | Consume |
|---|---|
| `/(institucional)/certificados` (lista) | `GET /certificados` |
| `/(institucional)/certificados/[id]` | `GET /certificados/:id` + `verifyCertificate(hash)` + `WalletPanel` (revocar) |
| `/(admin)/certificados` | `GET /admin/certificados` |
| `/(admin)/instituciones` | `GET /admin/instituciones` |
| `/(admin)/instituciones/[id]` | `GET /admin/instituciones/:id` + wallets/usuarios/certs |
| `/(admin)/usuarios` | `GET /admin/usuarios` + CRUD |

El `middleware.ts` debe redirigir por rol: `/admin/*` → solo `rol='admin'`; `/dashboard` y `/certificados` → institucional.

---

## Flujo verificar-por-código

```
1. GET /certificados/verificar?codigo=...  → backend busca en Supabase → devuelve { valido, hash, metadata }
2. frontend toma el hash → verifyCertificate(hash) (blockchain, rewrite /blockchain)
3. frontend combina metadata (DB) + estado on-chain (exists, revoked)
```

---

## Orden de trabajo sugerido

1. **Backend**: tablas SQL (`usuarios`, `institucion_wallets`) → guard con rol → endpoints de `certificados` (lista/detalle/revocar) y `admin/*`.
2. **Frontend**: `lib/wallet.ts` híbrido + `WalletPanel` → route group `(admin)` → páginas listas/detalles → `lib/api.ts` con los métodos nuevos.
3. **Verificar-por-código** (cablear DB → hash → on-chain en la página `/verificar`).
4. Integración y PR.

---

## Tarjetas / credenciales físicas (RFID)

Una credencial física (tarjeta NFC/RFID) tiene un `uid_rfid` y puede estar vinculada a uno o más certificados (tabla intermedia `certificados_credenciales`, muchos-a-muchos). El prototipo físico lee el UID y verifica los certificados vinculados.

### Tablas (schema `mydb`)

**`credenciales_fisicas`**

| columna | tipo |
|---|---|
| `credencial_id` | int PK |
| `uid_rfid` | text UNIQUE |
| `etiqueta` | text NULL |
| `institucion_id` | int NULL FK → instituciones |

**`certificados_credenciales`** (intermedia)

| columna | tipo |
|---|---|
| `id_certificado` | int FK → certificados |
| `credencial_id` | int FK → credenciales_fisicas |

### Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/certificados/por-rfid/:uid` | Público | certificados de una credencial (misma forma que `/verificar`; 404 si no existe) |
| GET | `/admin/credenciales` | Admin | lista de tarjetas |
| POST | `/admin/certificados/:id/credenciales` | Inst/Admin | vincula una tarjeta (`uid_rfid`) al certificado |
| DELETE | `/admin/certificados/:id/credenciales/:credencialId` | Inst/Admin | desvincula |

### Flujo verificar por tarjeta

```
1. GET /certificados/por-rfid/:uid   → { uidRfid, certificados: [ { hash, metadata... } ] }
2. frontend, por cada certificado → verifyCertificate(hash) (blockchain)
3. frontend combina metadata + estado on-chain por cada certificado de la tarjeta
```

Ruta pública: `/verificar?card_id=04A224B2` (modo "Por tarjeta RFID").

### Frontend (admin — pendiente)

Página `/(admin)/certificados/[id]`: sección "Tarjetas vinculadas" para listar, vincular (por UID) y desvincular tarjetas de un certificado. Consume los endpoints de arriba.

---

## Bugs / limpieza detectados

- `frontend/lib/types.ts`: `SubidaCertificado` y `DatosConfirmacionCertificado` duplicados.
- `backend/src/certificados/certificados.service.ts`: comentario `//Este tx_hash no sé...` + código comentado.
- `frontend/middleware.ts`: no discrimina rol (solo logueado/no).
