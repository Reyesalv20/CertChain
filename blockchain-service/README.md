# blockchain-service (puerto 6000)

Responsable de emitir y verificar certificados contra la blockchain (por ejemplo, guardando el hash del certificado en un smart contract).

## Cómo levantarlo

```bash
# Aislado, sin depender de ningún otro servicio
docker compose up blockchain-service
```

Acceso: http://localhost:6000/health

## Estado actual: placeholder

`src/index.js` tiene un servidor Express mínimo con 3 rutas:

- `GET /health` → confirma que el contenedor está arriba.
- `POST /certificados` → **501 Not Implemented**, placeholder para emitir un certificado en blockchain.
- `GET /certificados/:hash/verificar` → **501 Not Implemented**, placeholder para verificar un hash.

Reemplaza estos placeholders por la integración real. Ideas según la tecnología que elijan:

- **Ethereum-compatible (testnet, ej. Sepolia) con Hardhat + ethers.js**: agregar carpeta `contracts/`, compilar con Hardhat, y desde `src/index.js` usar `ethers` para firmar/leer transacciones.
- **Hyperledger Fabric** u otra red permisionada: adaptar el cliente SDK correspondiente.

## Variables de entorno

Ya configurada en `docker-compose.yml`: `PORT=6000`.

Cuando agregues la integración real, probablemente necesites (agrégalas a `docker-compose.yml` y a `.env.example` en la raíz):

- `RPC_URL` — endpoint del nodo/testnet.
- `PRIVATE_KEY` — clave de la wallet que firma transacciones (¡nunca subir a git, usar `.env`!).
- `CONTRACT_ADDRESS` — dirección del smart contract desplegado.

## Desarrollo local sin Docker (opcional)

```bash
cd blockchain-service
npm install
npm run dev
```
