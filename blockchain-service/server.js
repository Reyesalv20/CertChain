const express = require("express");
const config = require("./src/config");
const blockchain = require("./src/blockchain");
const { createCertificatesRouter } = require("./src/routes/certificates");
const { createRegistryRouter } = require("./src/routes/registry");

const app = express();
app.use(express.json());

app.use(
  createCertificatesRouter({
    certContract: blockchain.certContract,
    certContractReadOnly: blockchain.certContractReadOnly,
    provider: blockchain.provider,
    certArtifact: blockchain.certArtifact,
    registryArtifact: blockchain.registryArtifact,
    contractAddress: config.contractAddress,
    trustedIssuersAddress: config.trustedIssuersAddress,
  })
);

app.use(
  createRegistryRouter({
    registryContract: blockchain.registryContract,
    registryContractReadOnly: blockchain.registryContractReadOnly,
    isDevAdmin: config.isDevAdmin,
  })
);

app.listen(config.port, () => console.log(`Server en http://localhost:${config.port}`));
