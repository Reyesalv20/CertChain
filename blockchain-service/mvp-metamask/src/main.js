import { ethers } from "ethers";
import "./style.css";
import { config, certRead, registryRead } from "./chain.js";

// ── Escritura: se crea recién cuando el usuario conecta MetaMask ──
let signer = null;
let certWrite = null;
let registryWrite = null;

async function connect() {
  if (!window.ethereum) throw new Error("Instalá MetaMask");
  const provider = new ethers.BrowserProvider(window.ethereum); // MetaMask, no una URL
  await provider.send("eth_requestAccounts", []);              // dispara el popup de conectar
  signer = await provider.getSigner();                        // la cuenta activa en MetaMask
  certWrite = new ethers.Contract(config.certificates.address, config.certificates.abi, signer);
  registryWrite = new ethers.Contract(config.registry.address, config.registry.abi, signer);
  document.getElementById("account").textContent = "Conectado: " + (await signer.getAddress());
}

const setResult = (id, text) => { document.getElementById(id).textContent = text; };

// Chips de ejemplo: al hacer click rellenan el input correspondiente.
document.querySelectorAll(".chip[data-fill]").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.getElementById(chip.dataset.fill).value = chip.dataset.value;
  });
});

// ── Registrar certificado (firma) ────────────────────────────────
document.getElementById("register").addEventListener("click", async () => {
  try {
    const certHash = document.getElementById("certHash").value;
    await certWrite.registerCertificate.staticCall(certHash); // chequeo sin gas
    const tx = await certWrite.registerCertificate(certHash); // ← popup de MetaMask
    setResult("certResult", "Firmando... " + tx.hash);
    const receipt = await tx.wait();
    setResult("certResult", "Registrado ✓ bloque " + receipt.blockNumber);
  } catch (err) {
    setResult("certResult", "Error: " + (err?.revert?.args?.[0] ?? err?.shortMessage ?? err.message));
  }
});

// ── Revocar certificado (firma el emisor original o el admin) ─────
document.getElementById("revoke").addEventListener("click", async () => {
  try {
    const certHash = document.getElementById("certHash").value;
    await certWrite.revokeCertificate.staticCall(certHash);
    const tx = await certWrite.revokeCertificate(certHash);
    setResult("certResult", "Firmando... " + tx.hash);
    await tx.wait();
    setResult("certResult", "Revocado ✓");
  } catch (err) {
    setResult("certResult", "Error: " + (err?.revert?.args?.[0] ?? err?.shortMessage ?? err.message));
  }
});

// ── Verificar (solo lectura) ─────────────────────────────────────
document.getElementById("verify").addEventListener("click", async () => {
  try {
    const certHash = document.getElementById("certHash").value;
    const [exists, issuer, issueTimestamp, isRevoked] = await certRead.verifyCertificate(certHash);
    setResult("certResult", JSON.stringify({ exists, issuer, issueTimestamp: issueTimestamp.toString(), isRevoked }, null, 2));
  } catch (err) {
    setResult("certResult", "Error: " + err.message);
  }
});

// ── Agregar emisor (firma, solo admin) ───────────────────────────
document.getElementById("addIssuer").addEventListener("click", async () => {
  try {
    const address = document.getElementById("issuerAddress").value;
    const name = document.getElementById("issuerName").value;
    await registryWrite.addIssuer.staticCall(address, name);
    const tx = await registryWrite.addIssuer(address, name);
    setResult("issuerResult", "Firmando... " + tx.hash);
    await tx.wait();
    setResult("issuerResult", "Emisor agregado ✓");
  } catch (err) {
    setResult("issuerResult", "Error: " + (err?.revert?.args?.[0] ?? err?.shortMessage ?? err.message));
  }
});

// ── ¿Es confiable? (solo lectura) ────────────────────────────────
document.getElementById("isTrusted").addEventListener("click", async () => {
  try {
    const address = document.getElementById("issuerAddress").value;
    const trusted = await registryRead.isTrustedIssuer(address);
    const name = await registryRead.issuerName(address);
    setResult("issuerResult", JSON.stringify({ trusted, name }, null, 2));
  } catch (err) {
    setResult("issuerResult", "Error: " + err.message);
  }
});

// ── Conectar ─────────────────────────────────────────────────────
document.getElementById("connect").addEventListener("click", () =>
  connect().catch((e) => setResult("account", "Error: " + e.message))
);
