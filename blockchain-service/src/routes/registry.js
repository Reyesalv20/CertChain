// Rutas del registry de emisores confiables.
const express = require("express");
const { isValidAddress } = require("../utils");

function createRegistryRouter({ registryContract, registryContractReadOnly, isDevAdmin }) {
  const router = express.Router();

  // ── Consulta si una dirección es emisor confiable (view) ────
  router.post("/isTrustedIssuer", async (req, res) => {
    const { address } = req.body;
    if (!isValidAddress(address)) {
      return res.status(400).json({ ok: false, error: "Address invalida" });
    }
    try {
      const trusted = await registryContractReadOnly.isTrustedIssuer(address);
      const name = await registryContractReadOnly.issuerName(address);
      res.status(200).json({ ok: true, trusted, name });
    } catch (err) {
      const reason = err?.revert?.args?.[0] ?? err?.shortMessage ?? err.message;
      res.status(500).json({ ok: false, error: reason });
    }
  });

  // ── Alta/baja de emisores — SOLO en modo dev ───────────────
  // En producción estos endpoints no existen: el ente regulador firma client-side.
  if (isDevAdmin) {
    router.post("/addIssuer", async (req, res) => {
      const { address, name } = req.body;
      if (!isValidAddress(address)) {
        return res.status(400).json({ ok: false, error: "Address invalida" });
      }
      try {
        await registryContract.addIssuer.staticCall(address, name);

        const tx = await registryContract.addIssuer(address, name);
        const receipt = await tx.wait();
        res.status(200).json({ ok: true, txHash: tx.hash, blockNumber: receipt.blockNumber });
      } catch (err) {
        const reason = err?.revert?.args?.[0] ?? err?.shortMessage ?? err.message;
        const status = reason.includes("Solo el administrador puede agregar emisores") ? 403 : 500;
        res.status(status).json({ ok: false, error: reason });
      }
    });

    router.post("/removeIssuer", async (req, res) => {
      const { address } = req.body;
      if (!isValidAddress(address)) {
        return res.status(400).json({ ok: false, error: "Address invalida" });
      }
      try {
        await registryContract.removeIssuer.staticCall(address);

        const tx = await registryContract.removeIssuer(address);
        const receipt = await tx.wait();
        res.status(200).json({ ok: true, txHash: tx.hash, blockNumber: receipt.blockNumber });
      } catch (err) {
        const reason = err?.revert?.args?.[0] ?? err?.shortMessage ?? err.message;
        const status =
          reason.includes("Solo el administrador puede eliminar emisores") ||
          reason.includes("El emisor no esta registrado")
            ? 403
            : 500;
        res.status(status).json({ ok: false, error: reason });
      }
    });
  }

  return router;
}

module.exports = { createRegistryRouter };
