const express = require("express");
const { ethers } = require("ethers");

const app = express();
app.use(express.json());

// Conexión a la blockchain
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Emisor (cuenta 1)
const issuerWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const issuerSigner = new ethers.NonceManager(issuerWallet);
const certArtifact = require("./out/CertificateRegistry.sol/AcademicCertificates.json");
const certContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, certArtifact.abi, issuerSigner);

// Admin (cuenta 0)
const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
const adminSigner = new ethers.NonceManager(adminWallet);
const registryArtifact = require("./out/TrustedIssuersRegistry.sol/TrustedIssuersRegistry.json");
const registryContract = new ethers.Contract(process.env.TRUSTED_ISSUERS_ADDRESS, registryArtifact.abi, adminSigner);

// Debe devolver true si certHash es un bytes32 válido:
// empieza con "0x" + 64 caracteres hex. Pista: es una regex de una línea.
const isValidBytes32 = (certHash) => {
  if (typeof certHash !== 'string') return false;

  // Checks for '0x' followed by exactly 64 hexadecimal characters
  const bytes32Regex = /^0x[0-9a-fA-F]{64}$/;

  return bytes32Regex.test(certHash);
};

const isValidAddress = (addr) => /^0x[0-9a-fA-F]{40}$/.test(addr);

// ── Emisor: registrar certificado ──────────
app.post('/registerCertificate', async (req, res) => {
  const certHash = req.body.certHash;
  if (!isValidBytes32(certHash))
    return res.status(400).json({ ok: false, error: "certHash inválido" });
  try {
    await certContract.registerCertificate.staticCall(certHash);

    const tx = await certContract.registerCertificate(certHash);
    const receipt = await tx.wait();
    res.status(200).json({ ok: true, txHash: tx.hash, blockNumber: receipt.blockNumber });
  } catch (err) {
    // ethers v6: el motivo del revert está en err.revert.args[0]
    const reason = err?.revert?.args?.[0] ?? err?.shortMessage ?? err.message;
    const status = reason.includes("Emisor no autorizado") ? 403 : 500;
    res.status(status).json({ ok: false, error: reason });
  }
});

// ── Emisor: verificar certificado ──────────
app.post('/verifyCertificate', async (req, res) => {

    const certHash = req.body.certHash;
    if (!isValidBytes32(certHash))
        return res.status(400).json({ ok: false, error: "certHash inválido" });

    try {
        const [exists, issuer, issueTimestamp, isRevoked] = 
            await certContract.verifyCertificate(certHash);

        res.status(200).json({ ok: true, exists, issuer,
            issueTimestamp: issueTimestamp.toString(),
            isRevoked, valid: exists && !isRevoked
        });
    } catch (err) {
        const reason = err?.revert?.args?.[0] ?? err?.shortMessage ?? err.message;
        const status = 500;
        res.status(status).json({ ok: false, error: reason });
    }

});

// ── Admin: agregar emisor ──────────────────
app.post('/addIssuer', async (req, res) => {

    const { address, name } = req.body;
    if (!isValidAddress(address))
        return res.status(400).json({ ok: false, error: "Address invalida" });

    try {
        await registryContract.addIssuer.staticCall(address, name);

        const tx = await registryContract.addIssuer(address, name);
        const receipt = await tx.wait();
        res.status(200).json({ ok: true, txHash: tx.hash, blockNumber: receipt.blockNumber});
    } catch (err) {
        const reason = err?.revert?.args?.[0] ?? err?.shortMessage ?? err.message;
        const status = reason.includes("Solo el administrador puede agregar emisores") ? 403 : 500;
        res.status(status).json({ ok:false, error: reason });
    }

});

// ── Admin: eliminar emisor ─────────────────
app.post('/removeIssuer', async (req, res) => {

    const { address } = req.body;
    if (!isValidAddress(address))
        return res.status(400).json({ ok: false, error: "Address invalida" });

    try {
        await registryContract.removeIssuer.staticCall(address);

        const tx = await registryContract.removeIssuer(address);
        const receipt = await tx.wait();
        res.status(200).json({ ok: true, txHash: tx.hash, blockNumber: receipt.blockNumber});
    } catch (err) {
        const reason = err?.revert?.args?.[0] ?? err?.shortMessage ?? err.message;
        const status = reason.includes("Solo el administrador puede eliminar emisores") || 
            reason.includes("El emisor no esta registrado") ? 403 : 500;
        res.status(status).json({ ok:false, error: reason });
    }
});

// ── Admin: consultar si un emisor es confiable ──
app.post('/isTrustedIssuer', async (req, res) => {
    const { address } = req.body;
    if (!isValidAddress(address))
        return res.status(400).json({ ok: false, error: "Address invalida" });

    try {

        const trusted = await registryContract.isTrustedIssuer(address);
        const name = await registryContract.issuerName(address);

        res.status(200).json({ ok: true, trusted, name });
    } catch (err) {
        const reason = err?.revert?.args?.[0] ?? err?.shortMessage ?? err.message;
        const status = reason.includes("Solo el administrador puede agregar emisores") ||
            reason.includes("El emisor no esta registrado") ? 403 : 500;

        res.status(status).json({ ok:false, error: reason });
    }

});

const PORT = process.env.PORT || 6000;
app.listen(PORT, () => console.log(`Server en http://localhost:${PORT}`));
