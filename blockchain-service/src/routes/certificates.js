// Rutas de certificados: registro (legacy), verificación y config.
const express = require("express");
const { isValidBytes32 } = require("../utils");

function createCertificatesRouter({
  certContract,
  certContractReadOnly,
  provider,
  certArtifact,
  registryArtifact,
  contractAddress,
  trustedIssuersAddress,
}) {
  const router = express.Router();

  // ── Emisor: registrar certificado (fallback de dev) ────────
  router.post("/registerCertificate", async (req, res) => {
    const certHash = req.body.certHash;
    if (!isValidBytes32(certHash)) {
      return res.status(400).json({ ok: false, error: "certHash inválido" });
    }
    try {
      await certContract.registerCertificate.staticCall(certHash);

      const tx = await certContract.registerCertificate(certHash);
      const receipt = await tx.wait();
      res.status(200).json({ ok: true, txHash: tx.hash, blockNumber: receipt.blockNumber });
    } catch (err) {
      const reason = err?.revert?.args?.[0] ?? err?.shortMessage ?? err.message;
      const status = reason.includes("Emisor no autorizado") ? 403 : 500;
      res.status(status).json({ ok: false, error: reason });
    }
  });

  // ── Emisor: verificar certificado (view) ───────────────────
  router.post("/verifyCertificate", async (req, res) => {
    const certHash = req.body.certHash;
    if (!isValidBytes32(certHash)) {
      return res.status(400).json({ ok: false, error: "certHash inválido" });
    }
    try {
      const [exists, issuer, issueTimestamp, isRevoked] =
        await certContractReadOnly.verifyCertificate(certHash);

      res.status(200).json({
        ok: true,
        exists,
        issuer,
        issueTimestamp: issueTimestamp.toString(),
        isRevoked,
        valid: exists && !isRevoked,
      });
    } catch (err) {
      const reason = err?.revert?.args?.[0] ?? err?.shortMessage ?? err.message;
      res.status(500).json({ ok: false, error: reason });
    }
  });

  // ── Config para otros servicios ────────────────────────────
  router.get("/config", async (req, res) => {
    try {
      const chainId = (await provider.getNetwork()).chainId;
      res.status(200).json({
        chainId: chainId.toString(),
        certificates: { address: contractAddress, abi: certArtifact.abi },
        registry: { address: trustedIssuersAddress, abi: registryArtifact.abi },
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

module.exports = { createCertificatesRouter };
