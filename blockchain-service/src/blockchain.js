// Conexión a la blockchain: provider, wallets y contratos.
const { ethers } = require("ethers");
const config = require("./config");

const provider = new ethers.JsonRpcProvider(config.rpcUrl);

const certArtifact = require("../out/CertificateRegistry.sol/AcademicCertificates.json");
const registryArtifact = require("../out/TrustedIssuersRegistry.sol/TrustedIssuersRegistry.json");

// ── Emisor (cuenta 1) ────────────────────────────────────────
// Firma el fallback legacy /registerCertificate.
const issuerWallet = new ethers.Wallet(config.privateKey, provider);
const issuerSigner = new ethers.NonceManager(issuerWallet);
const certContract = new ethers.Contract(config.contractAddress, certArtifact.abi, issuerSigner);

// ── Solo lectura (sin signer) ────────────────────────────────
// Las funciones view no firman; usan el provider directo.
const certContractReadOnly = new ethers.Contract(config.contractAddress, certArtifact.abi, provider);
const registryContractReadOnly = new ethers.Contract(config.trustedIssuersAddress, registryArtifact.abi, provider);

// ── Admin (cuenta 0) — SOLO en modo dev ──────────────────────
// En producción no se carga la clave admin ni se firma acá: el ente
// regulador firma client-side. El flag lo controla ENABLE_DEV_ADMIN.
let registryContract = null;
if (config.isDevAdmin) {
  if (!config.adminPrivateKey) {
    console.error("ERROR: ENABLE_DEV_ADMIN=true pero falta ADMIN_PRIVATE_KEY");
    process.exit(1);
  }
  const adminWallet = new ethers.Wallet(config.adminPrivateKey, provider);
  const adminSigner = new ethers.NonceManager(adminWallet);
  registryContract = new ethers.Contract(config.trustedIssuersAddress, registryArtifact.abi, adminSigner);
}

module.exports = {
  provider,
  certArtifact,
  registryArtifact,
  certContract,
  certContractReadOnly,
  registryContractReadOnly,
  registryContract,
};
