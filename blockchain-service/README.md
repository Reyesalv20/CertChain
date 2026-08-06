# blockchain-service (puerto 6000)

Responsable de emitir y verificar certificados contra la blockchain (por ejemplo, guardando el hash del certificado en un smart contract).


## Estructura del microservicio 

```
blockchain-service/
├── contracts/                 ← TODO lo de Foundry (contrato + tooling)
│   ├── foundry.toml
│   ├── src/CertificateRegistry.sol   ← el contrato AcademicCertificates
│   ├── lib/forge-std                (submódulo, para tests)
│   ├── script/ / test/ / cache/ / out/
├── server.js                  ← API Express + ethers (registrar/verificar)
├── package.json + package-lock.json
├── Dockerfile                 ← imagen multi-stage del server
├── docker-compose.yml         ← anvil + deploy + server
├── deploy.sh                  ← despliega el contrato (dentro de Docker)
├── entrypoint.sh              ← arranca el server (espera la dirección)
└── .env.example               ← plantilla de configuración local
```

---

## Requisitos

| Para el flujo local | Para el flujo Docker |
|---|---|
| [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast, anvil) | Docker + Docker Compose |
| Node.js 24+ | _(nada más — todo vive en contenedores)_ |

---

# Flujo 1 — Desarrollo y testeo SIN Docker (local)

## 1.1 Levantar la blockchain local

```bash
anvil
```

Queda escuchando en `http://127.0.0.1:8545` con 10 cuentas de prueba (1.000 ETH cada una). La cuenta 0 (`0xf39F...`) es la que firma los deploys.

## 1.2 Compilar y testear el contrato

**Los comandos de foundry se corren dentro de `contracts/`:**

```bash
cd contracts
forge build
forge test
```

- `forge build` genera el ABI en `contracts/out/CertificateRegistry.sol/AcademicCertificates.json`
- `forge test` aún no tiene tests (las carpetas `test/` y `script/` están vacías — pendiente)

## 1.3 Desplegar el contrato

```bash
forge create src/CertificateRegistry.sol:AcademicCertificates \
  --broadcast \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

> ⚠️ `--broadcast` es **obligatorio** en Foundry v1.7.1: sin él, `forge create` solo hace un dry-run y no transmite nada.

La dirección suele ser `0x5FbDB2315678afecb367f032d93F642f64180aa3` (anvil es determinista).

## 1.4 Configurar las variables de entorno

```bash
cp .env.example .env
```

(El `.env` real está en `.gitignore` — nunca se commitea.)

## 1.5 Levantar el server

El server lee el ABI de `./out/`, pero con la estructura nueva forge lo genera en `contracts/out`. Para el desarrollo local, creá un symlink (en Docker esto no hace falta, la imagen lo normaliza solo):

```bash
# puente local: out/ → contracts/out
ln -sf contracts/out out

node --env-file=.env server.js
```


> ⚠️ `--env-file` es **obligatorio**: sin él, `process.env.PRIVATE_KEY` es `undefined` y el server falla con "invalid private key".

## 1.6 Probar el server con peticiones

```bash
# Registrar un certificado
curl -X POST http://localhost:4000/registerCertificate \
  -H "Content-Type: application/json" \
  -d '{"certHash":"0x1111111111111111111111111111111111111111111111111111111111111111"}'

# Verificarlo
curl -X POST http://localhost:4000/verifyCertificate \
  -H "Content-Type: application/json" \
  -d '{"certHash":"0x1111111111111111111111111111111111111111111111111111111111111111"}'
```

Respuestas esperadas:

| Petición | Respuesta |
|---|---|
| register (hash válido) | `{"ok":true,"txHash":"0x...","blockNumber":N}` |
| verify (registrado) | `{"ok":true,"exists":true,"valid":true,"issuer":"0xf39F...","issueTimestamp":"...","isRevoked":false}` |
| verify (desconocido) | `{"ok":true,"exists":false,"valid":false}` |
| hash inválido (ej. `"abc"`) | HTTP 400 → `{"ok":false,"error":"certHash inválido"}` |

Para generar hashes de prueba: `cast keccak "mi texto"` o cualquier string de 64 hex con `0x` adelante.

## 1.7 Interactuar directo con la cadena (cast)

```bash
cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "verifyCertificate(bytes32)(bool,address,uint256,bool)" \
  0x1111111111111111111111111111111111111111111111111111111111111111 \
  --rpc-url http://127.0.0.1:8545
```

---

# Flujo 2 — Todo con Docker

## 2.1 Levantar el stack

```bash
docker compose up -d --build    # primera vez (baja imágenes, ~1.5 GB)
docker compose up -d            # las siguientes
```

Esto levanta **3 servicios**:

| Servicio | Rol | Expuesto en |
|---|---|---|
| `anvil` | la blockchain local (efímera) | `http://localhost:8545` |
| `deploy` | compila y despliega el contrato (corre una vez y sale) | — |
| `server` | tu API Express | `http://localhost:4000` (3000 adentro) |

Nada de anvil/forge/node instalado: todo corre dentro de los contenedores.

## 2.2 Probar con peticiones (las mismas de antes)

```bash
curl -X POST http://localhost:6000/registerCertificate \
  -H "Content-Type: application/json" \
  -d '{"certHash":"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'

curl -X POST http://localhost:6000/verifyCertificate \
  -H "Content-Type: application/json" \
  -d '{"certHash":"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'
```

Esperá las mismas respuestas de la tabla del flujo local.

## 2.3 Verificar la cadena del contenedor con cast

```bash
cast chain-id --rpc-url http://127.0.0.1:8545   # → 31337

cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  "verifyCertificate(bytes32)(bool,address,uint256,bool)" \
  0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
  --rpc-url http://127.0.0.1:8545
```

## 2.4 Logs y apagado

```bash
docker compose logs -f server     # también: deploy, anvil
docker compose down               # apaga todo (conserva el volumen)
docker compose down -v && docker compose up -d   # reinicio limpio ← REGLA DE ORO
```

---

# Cositas importantes (lo aprendido a las piñas)

1. **Regla de oro: `docker compose down -v && docker compose up -d`.** `anvil` es **efímero** (la cadena vive en memoria), `deploy` corre **una sola vez**, y el volumen `shared` (con la dirección del contrato) **persiste**. Si anvil se reinicia sin que deploy vuelva a correr, el server queda apuntando a una dirección vieja y falla con `could not decode result data (value="0x")`. Por eso `entrypoint.sh` verifica con `eth_getCode` que el contrato exista antes de arrancar, y te dice el error claro. **El `-v` borra el volumen → la dirección vieja no puede sobrevivir.**

2. **`node --env-file=.env server.js`**: sin ese flag no se cargan las variables y el server no arranca ("invalid private key").

3. **`forge create --broadcast`**: sin `--broadcast`, Foundry v1.7.1 no transmite (hace dry-run).

4. **Las claves son de desarrollo**: `0xac09...` es la private key pública de la cuenta 0 de anvil. Está hardcodeada en `docker-compose.yml` **a propósito** (stack 100% local de dev). Jamás usar estas claves fuera de un entorno de prueba.

