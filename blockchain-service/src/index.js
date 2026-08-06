const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 6000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'blockchain-service' });
});

// TODO: reemplazar con integración real (smart contract / ethers.js / web3)
app.post('/certificados', (req, res) => {
  res.status(501).json({
    message: 'Placeholder: emisión de certificado en blockchain aún no implementada',
  });
});

// TODO: reemplazar con verificación real contra la blockchain
app.get('/certificados/:hash/verificar', (req, res) => {
  res.status(501).json({
    message: 'Placeholder: verificación en blockchain aún no implementada',
    hash: req.params.hash,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`blockchain-service corriendo en puerto ${PORT}`);
});
