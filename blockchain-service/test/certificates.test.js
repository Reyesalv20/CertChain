const express = require("express");
const request = require("supertest");
const { createCertificatesRouter } = require("../src/routes/certificates");

const VALID_HASH = "0x" + "a".repeat(64);
const CONTRACT_ADDRESS = "0x" + "1".repeat(40);
const REGISTRY_ADDRESS = "0x" + "2".repeat(40);

// mock del provider: /config llama provider.getNetwork()
const provider = { getNetwork: async () => ({ chainId: 31337 }) };

// ABIs falsos: /config los devuelve tal cual
const certArtifact = { abi: [{ type: "function", name: "registerCertificate" }] };
const registryArtifact = { abi: [{ type: "function", name: "addIssuer" }] };

// Contrato firmado "feliz": registrar devuelve una tx fake minada en el bloque 42.
function happyCertContract() {
  const registerCertificate = async () => ({
    hash: "0xTXDEFORMATO",
    wait: async () => ({ blockNumber: 42 }),
  });
  registerCertificate.staticCall = async () => {};
  return { registerCertificate };
}

// Contrato read-only "feliz": verify devuelve la tupla.
function happyReadOnly() {
  return { verifyCertificate: async () => [true, "0x" + "3".repeat(40), 123, false] };
}

// Arma un app con el router y las dependencias fake.
function makeApp({ certContract, certContractReadOnly }) {
  const app = express();
  app.use(express.json());
  app.use(createCertificatesRouter({
    certContract,
    certContractReadOnly,
    provider,
    certArtifact,
    registryArtifact,
    contractAddress: CONTRACT_ADDRESS,
    trustedIssuersAddress: REGISTRY_ADDRESS,
  }));
  return app;
}

describe("POST /registerCertificate", () => {
  test("hash inválido → 400", async () => {
    const app = makeApp({ certContract: happyCertContract(), certContractReadOnly: happyReadOnly() });
    const res = await request(app).post("/registerCertificate").send({ certHash: "no-es-hash" });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test("hash válido → 200 con txHash y blockNumber", async () => {
    const app = makeApp({ certContract: happyCertContract(), certContractReadOnly: happyReadOnly() });
    const res = await request(app).post("/registerCertificate").send({ certHash: VALID_HASH });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.blockNumber).toBe(42);
  });

  test("emisor no autorizado → 403", async () => {
    const err = new Error("call revert");
    err.revert = { args: ["Emisor no autorizado"] };
    const registerCertificate = async () => { throw err; };
    registerCertificate.staticCall = async () => { throw err; };
    const app = makeApp({ certContract: { registerCertificate }, certContractReadOnly: happyReadOnly() });
    const res = await request(app).post("/registerCertificate").send({ certHash: VALID_HASH });
    expect(res.status).toBe(403);
  });

  test("error inesperado → 500", async () => {
    const registerCertificate = async () => { throw new Error("boom"); };
    registerCertificate.staticCall = async () => {};
    const app = makeApp({ certContract: { registerCertificate }, certContractReadOnly: happyReadOnly() });
    const res = await request(app).post("/registerCertificate").send({ certHash: VALID_HASH });
    expect(res.status).toBe(500);
  });
});

describe("POST /verifyCertificate", () => {
  test("hash inválido → 400", async () => {
    const app = makeApp({ certContract: happyCertContract(), certContractReadOnly: happyReadOnly() });
    const res = await request(app).post("/verifyCertificate").send({ certHash: "nope" });
    expect(res.status).toBe(400);
  });

  test("existente → 200 valid true", async () => {
    const app = makeApp({ certContract: happyCertContract(), certContractReadOnly: happyReadOnly() });
    const res = await request(app).post("/verifyCertificate").send({ certHash: VALID_HASH });
    expect(res.status).toBe(200);
    expect(res.body.exists).toBe(true);
    expect(res.body.valid).toBe(true);
    expect(res.body.issueTimestamp).toBe("123");
  });

  test("error → 500", async () => {
    const certContractReadOnly = { verifyCertificate: async () => { throw new Error("boom"); } };
    const app = makeApp({ certContract: happyCertContract(), certContractReadOnly });
    const res = await request(app).post("/verifyCertificate").send({ certHash: VALID_HASH });
    expect(res.status).toBe(500);
  });
});

describe("GET /config", () => {
  test("devuelve chainId y direcciones", async () => {
    const app = makeApp({ certContract: happyCertContract(), certContractReadOnly: happyReadOnly() });
    const res = await request(app).get("/config");
    expect(res.status).toBe(200);
    expect(res.body.chainId).toBe("31337");
    expect(res.body.certificates.address).toBe(CONTRACT_ADDRESS);
    expect(res.body.registry.address).toBe(REGISTRY_ADDRESS);
  });
});
