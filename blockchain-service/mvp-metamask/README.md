# MVP MetaMask — CertChain

Proyecto de prueba **independiente** para experimentar con la firma de transacciones desde el navegador usando **MetaMask**, antes de implementarlo en el frontend real.

Permite, contra la blockchain local (anvil):

| Acción | Firma | Qué demuestra |
|---|---|---|
| `registerCertificate(hash)` | sí (MetaMask) | emisión de certificado firmada por la universidad |
| `revokeCertificate(hash)` | sí (MetaMask) | revocación firmada por el emisor original o el admin |
| `verifyCertificate(hash)` | no (view) | verificación pública, sin gas |
| `addIssuer(address, name)` | sí (solo admin) | alta de emisor confiable por el ente regulador |
| `isTrustedIssuer(address)` | no (view) | consulta del registry |

## Requisitos

- **MetaMask** instalado en el navegador.
- El stack del blockchain-service corriendo (`anvil` en `8545` y el server en `6000`):

```bash
cd blockchain-service
docker compose down -v && docker compose up -d    # la regla de oro
```

- Node.js + npm.

## Cómo levantarlo

```bash
cd blockchain-service/mvp-metamask
npm install
npm run dev
```

Abrí `http://localhost:5173` (la App) y `http://localhost:5173/explorer.html` (el Explorer).

> El frontend obtiene las direcciones y ABIs de los contratos desde `/config` (a través del proxy de Vite, definido en `vite.config.js`), así que no hay que hardcodear nada ni lidiar con CORS.

## Variables de entorno

El MVP lee dos variables (ver `.env.example`):

| Variable | Default | Qué es |
|---|---|---|
| `VITE_RPC_URL` | `http://127.0.0.1:8545` | RPC de anvil para las **lecturas** (view) |
| `VITE_CONFIG_URL` | `/config` | URL del `/config` del blockchain-service (proxy local, o URL completa con túnel) |

Copia `.env.example` a `.env` si querés cambiarlas (Vite las lee al arrancar; hay que reiniciar `npm run dev` tras editarlas).

## Configurar MetaMask

### 1. Agregar la red local

MetaMask → selector de red → **"Add network"** (agregar manualmente):

| Campo | Valor |
|---|---|
| Network name | `Anvil` |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency symbol | `ETH` |

### 2. Importar las cuentas de prueba

anvil expone **10 cuentas** con 10.000 ETH cada una. Importá las que necesites con
MetaMask → cuenta → **"Import account"** (pegás la private key).

| # | Dirección | Private key |
|---|---|---|
| 0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| 3 | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |
| 4 | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a` |
| 5 | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | `0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba` |
| 6 | `0x976EA74026E726554dB657fA54763abd0C3a0aa9` | `0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e` |
| 7 | `0x14dC79964da2C08b23698B3D3cc7Ca32193d9955` | `0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356` |
| 8 | `0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f` | `0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97` |
| 9 | `0xa0Ee7A142d267C1f36714E4a8F75612F20a79720` | `0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6` |

**Roles en este proyecto** (según quién desplegó y quién se registró en el deploy):

| Cuenta | Rol | Sirve para |
|---|---|---|
| 0 (`0xf39F...`) | **Admin / ente regulador** | desplegó los contratos → puede `addIssuer` |
| 1 (`0x7099...`) | **Emisor (universidad)** | `deploy.sh` la registró como confiable → puede `registerCertificate` |
| 2–9 | cuentas libres | para probar el caso negativo (no autorizado) |

## Valores de prueba

En el sitio estos mismos valores aparecen como **chips clickeables** bajo cada input (click → rellena el campo).

### Hashes de certificado

```text
0x1111111111111111111111111111111111111111111111111111111111111111
0x2222222222222222222222222222222222222222222222222222222222222222
0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
```

### Direcciones de emisores útiles

| Dirección | Rol |
|---|---|
| `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | admin (ente regulador) |
| `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | emisor ya registrado en el deploy |
| `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | libre (para probar `addIssuer`) |
| `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | libre (para probar `addIssuer`) |

## Probar el flujo

1. **Conectar wallet** → elegí la cuenta **emisor** (cuenta 1).
2. **Registrar**: pegá un hash válido (0x + 64 hex) y click en **"Registrar"**:
   ```
   0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
   ```
   → MetaMask pide confirmación → aceptá → `Registrado ✓ bloque N`.
3. **Verificar** → muestra `{ exists: true, issuer: 0x7099..., isRevoked: false }` (sin popup).
4. **Revocar**: con el mismo hash ya registrado, click en **"Revocar"** (con la cuenta emisor o admin) → confirmá → `Revocado ✓`. Volvé a **"Verificar"** → `isRevoked: true`.
5. Cambiá a la cuenta **admin** (cuenta 0) en MetaMask.
6. **Agregar emisor**: pegá una dirección (ej. la cuenta 2 `0x3C44...`) + un nombre → confirmá.
7. **¿Es confiable?** → `{ trusted: true, name: "..." }`.

### Caso negativo (para entender la validación on-chain)

Con la cuenta **2** conectada (que NO está en el registry), intentá **"Registrar"** → el `staticCall` revierte con **"Emisor no autorizado"**. Es la prueba de que la validación vive en la cadena, no en el frontend.

## Explorer (ver la inmutabilidad y la confianza)

El Explorer es ahora una **página aparte**: `http://localhost:5173/explorer.html`. Muestra la cadena en vivo, con más detalle:

- **Últimos bloques** (auto-refresh 4s, pausable): nº, cantidad de tx, `hash` y `parentHash`.
- **Bloque seleccionado** (click en un bloque): `hash`, `parentHash`, timestamp, miner, gas, y la lista de transacciones que contiene (clickeables).
- **Transacción** (por hash o click desde un bloque): `hash`, función decodificada (ej. `registerCertificate(0x...)`), `from` (quién firmó), `to`, nonce, value, gas, `status`, `gasUsed` y los **`logs`** decodificados (los eventos `CertificateRegistered`/`CertificateRevoked`).

### Cómo leerlo para validar la cadena

**Inmutabilidad (cadena de hashes):** en un bloque, su `parent hash` es el `hash` del bloque anterior. Es una cadena encadenada: editar un bloque viejo cambia su hash y rompe el eslabón. Lo verificás comparando `parent hash` del bloque N contra el `hash` del bloque N-1.

**Confianza (quién y cuándo):** el `from` de una tx está probado por firma criptográfica (no se puede falsificar sin la clave), los `logs` demuestran que el evento se emitió (y por lo tanto que el `require(isTrustedIssuer)` on-chain pasó), y el `timestamp` del bloque sella el "cuándo".

### Demostración rápida

1. Registrá un certificado en la App y copiá el `txHash`.
2. Andá al Explorer → pegá el hash en "Transacción" → ves la función `registerCertificate(...)`, el `from` (el emisor) y el evento en los logs.
3. Click en el bloque de esa tx → su `parent hash` == `hash` del bloque anterior. Esa es la inmutabilidad en acción.

## Modo compartido (túnel para el equipo)

Para que varios miembros usen **el mismo anvil** sin servidor propio:

1. Levantá el stack local y exponé los puertos con un túnel:
   ```bash
   ngrok http 8545    # RPC para MetaMask
   ngrok http 6000    # blockchain-service (/config, verify...)
   ```
   (o `cloudflared tunnel --url http://localhost:8545` — suele ir más liso para JSON-RPC que ngrok free).
2. Editá `.env` del MVP con las URLs del túnel:
   ```env
   VITE_RPC_URL=https://xxx.ngrok.io
   VITE_CONFIG_URL=https://yyy.ngrok.io/config
   ```
3. Compartí con el equipo:
   - La **RPC URL** (`https://xxx.ngrok.io`) → para agregar la red en MetaMask (chainId `31337`).
   - Las **10 private keys** (tabla de arriba).
   - La **URL del blockchain-service** (`https://yyy.ngrok.io`).

> ⚠️ Las claves son públicas de anvil: cualquiera con la URL del túnel puede escribir en la cadena. Para pruebas de equipo está bien; no lo uses para nada con valor real.

## Testnet (para más adelante — aún no implementado)

Para probar desde varias computadoras sin tunelar anvil, lo natural es pasar a una **red de prueba pública** (testnet): una blockchain igual que mainnet pero con ETH de prueba gratis (de un "faucet"). Todos se conectan a la misma red real.

Opciones: **Sepolia** (Ethereum, ~12s de bloque) o una **L2** como **Optimism / Base / Arbitrum Sepolia** (~2s, más baratas y rápidas — las recomendadas para esto).

### Qué cambiaría

| Pieza | Hoy (anvil) | En testnet |
|---|---|---|
| `deploy.sh` | `--rpc-url http://anvil:8545` + key de anvil | `--rpc-url <RPC del testnet>` + una **cuenta real con ETH de faucet** |
| `VITE_RPC_URL` (MVP) | `http://127.0.0.1:8545` | `https://<rpc-del-testnet>` |
| `RPC_URL` (blockchain-service) | `http://anvil:8545` | la del testnet |
| Direcciones de contratos | deterministas (`0x5FbD...`) | las del deploy real (se comparten vía `/config`) |
| MetaMask | red "Anvil" (31337) | red del testnet (chainId real) |

### Pasos (cuando lo encaremos)

1. Generar una cuenta nueva (`cast wallet new`) y **fondearla con un faucet**.
2. Deploy de los contratos al testnet (`forge create`).
3. Compartir con el equipo: `chainId`, RPC URL y direcciones (vía `/config`).
4. Cada miembro agrega la red en MetaMask y se fondea con el faucet.
5. Apuntar `deploy.sh` / `.env` / `docker-compose` al testnet.

### Advertencias

- **Nunca uses las claves de anvil en un testnet**: son públicas y cualquiera las tomaría para drenar tu ETH de prueba. Usá cuentas nuevas generadas localmente.
- Se necesita un **endpoint RPC** (Alchemy/Infura/QuickNode gratis, o un RPC público con rate limit).
- Cada miembro necesita **ETH de prueba** (faucet) para firmar transacciones.

## Errores comunes

| Mensaje | Causa |
|---|---|
| `Emisor no autorizado` | Firmando con una cuenta que no está en el registry. Usá la cuenta 1 (o agregá la tuya como admin). |
| `Solo el administrador...` en "Agregar emisor" | Estás con una cuenta que no es admin. Usá la cuenta 0. |
| "Could not fetch chain ID" | anvil no está corriendo. Levantá el stack con `docker compose up -d`. |
| "No tenés ETH" / insufficient funds | Cuenta nueva en MetaMask (no importada) o red equivocada. Verificá que estés en la red `Anvil` y con una de las cuentas de la tabla. |

## Estructura

```
mvp-metamask/
├── index.html          ← la App (conectar, certificado, emisor)
├── explorer.html       ← el Explorer (bloques, transacciones, logs)
├── vite.config.js      ← proxy /config + build multi-página
├── .env.example        ← VITE_RPC_URL y VITE_CONFIG_URL
├── package.json
└── src/
    ├── chain.js        ← config + proveedor + contratos (compartido)
    ├── main.js         ← lógica de la App (BrowserProvider + getSigner)
    ├── explorer.js     ← lógica del Explorer (bloques, tx, logs)
    └── style.css
```
