import { ethers } from "ethers";

// URLs configurables por entorno (ver .env / .env.example).
const RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";
const CONFIG_URL = import.meta.env.VITE_CONFIG_URL || "/config";

// Direcciones + ABI desde el blockchain-service (sin hardcodear).
const config = await (await fetch(CONFIG_URL)).json();

// Proveedor de SOLO LECTURA: directo a anvil, no necesita MetaMask.
const readProvider = new ethers.JsonRpcProvider(RPC_URL);
const certRead = new ethers.Contract(config.certificates.address, config.certificates.abi, readProvider);
const registryRead = new ethers.Contract(config.registry.address, config.registry.abi, readProvider);

export { RPC_URL, CONFIG_URL, config, readProvider, certRead, registryRead };
