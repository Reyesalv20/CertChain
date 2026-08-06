const express = require("express");
const { ethers } = require("ethers");

const app = express();
app.use(express.json());

// Conexión a la blockchain
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const artifact = require("./out/CertificateRegistry.sol/AcademicCertificates.json");
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, artifact.abi, wallet);

// ── TU TAREA 1: helper de validación ──────────────────────────────
// Debe devolver true si certHash es un bytes32 válido:
// empieza con "0x" + 64 caracteres hex. Pista: es una regex de una línea.

const isValidBytes32 = (certHash) => {
  if (typeof certHash !== 'string') return false;

  // Checks for '0x' followed by exactly 64 hexadecimal characters
  const bytes32Regex = /^0x[0-9a-fA-F]{64}$/;

  return bytes32Regex.test(certHash);
};
// ── TU TAREA 2: POST /registerCertificate ─────────────────────────
// 1. validar hash → 400 si es inválido
// 2. enviar tx firmada:   const tx = await contract.registerCertificate(certHash);
// 3. esperar confirmación: const receipt = await tx.wait();
// 4. responder: { ok: true, txHash: tx.hash, blockNumber: receipt.blockNumber }
// try/catch → 500 con el mensaje del error

app.post('/registerCertificate', async (req, res) => {
    const certHash = req.body.certHash;

    if (!isValidBytes32(certHash)) {
        return res.status(400).json({ ok: false, error: "certHash inválido" });
    }

    try {
        const tx = await contract.registerCertificate(certHash);
        const receipt = await tx.wait();

        res.status(200).json({
            ok: true, txHash: tx.hash, blockNumber: receipt.blockNumber
        });
    } catch (err) {
        res.status(500).json({ok:false, error: err.message });
    }

});

// ── TU TAREA 3: POST /verifyCertificate ───────────────────────────
// 1. validar hash → 400 si es inválido
// 2. leer sin gas: const [exists, issuer, issueTimestamp, isRevoked] =
//                   await contract.verifyCertificate(certHash);
// 3. responder: { ok: true, exists, issuer, issueTimestamp, isRevoked, valid: exists && !isRevoked }

app.post('/verifyCertificate', async (req, res) => {
    const certHash = req.body.certHash;

    if (!isValidBytes32(certHash)) {
        return res.status(400).json({ ok: false, error: "certHash inválido" });
    }

    try{
        const [exists, issuer, issueTimestamp, isRevoked] = await contract.verifyCertificate(certHash);

        res.status(200).json({
            ok:true, exists, issuer, issueTimestamp: issueTimestamp.toString(), isRevoked, valid: exists && !isRevoked })

    } catch (err) {
        res.status(500).json({ok:false, error: err.message });
    }
});

const PORT = process.env.PORT || 6000;
app.listen(PORT, () => console.log(`Server en http://localhost:${PORT}`));
