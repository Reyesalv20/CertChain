const express = require("express");
const request = require("supertest");
const { createRegistryRouter } = require("../src/routes/registry");

const VALID_HASH = "0x" + "a".repeat(64);
const CONTRACT_ADDRESS = "0x" + "1".repeat(40);
const REGISTRY_ADDRESS = "0x" + "2".repeat(40);

// mock del provider: /config llama provider.getNetwork()
const provider = { getNetwork: async () => ({ chainId: 31337 }) };

// ABIs falsos: /config los devuelve tal cual
const certArtifact = { abi: [{ type: "function", name: "registerCertificate" }] };
const registryArtifact = { abi: [{ type: "function", name: "addIssuer" }] };

const registryContractReadOnly = {
    isTrustedIssuer: async () => true,
    issuerName: async () => "Universidad de Vanguardia"
};

// Contrato firmado "feliz": registrar devuelve una tx fake minada en el bloque 42.
function happyRegistryContract() {
    const addIssuer = async () => ({
        hash: "0xTXDEFORMATO",
        wait: async () => ({ blockNumber: 42 }),
    });
    addIssuer.staticCall = async () => {};

    const removeIssuer = async () => ({
        hash: "0xTXDEFORMATO",
        wait: async () => ({ blockNumber: 43 }),
    });
    removeIssuer.staticCall = async () => {};

    return { addIssuer, removeIssuer };
}

function makeApp(isDevAdmin) {
    const app = express();
    app.use(express.json());
    app.use(createRegistryRouter({ 
        registryContract: happyRegistryContract(),
        registryContractReadOnly: registryContractReadOnly,
        isDevAdmin: isDevAdmin }));

    return app;
}

describe("POST /isTrustedIssuer", () => {
  test("address válido → 200", async () => {
    const res = await request(makeApp(true))
      .post("/isTrustedIssuer")
      .send({ address: "0x" + "3".repeat(40) });
    expect(res.status).toBe(200);
    expect(res.body.trusted).toBe(true);
    expect(res.body.name).toBe("Universidad de Vanguardia");
  });

  test("address inválido → 400", async () => {
    const res = await request(makeApp(true))
      .post("/isTrustedIssuer")
      .send({ address: "nope" });
    expect(res.status).toBe(400);
  });
});

describe("gate ENABLE_DEV_ADMIN", () => {
  test("addIssuer existe cuando isDevAdmin=true → 200", async () => {
    const res = await request(makeApp(true))
      .post("/addIssuer")
      .send({ address: "0x" + "3".repeat(40), name: "Universidad X" });
    expect(res.status).toBe(200);
  });

  test("addIssuer NO existe cuando isDevAdmin=false → 404", async () => {
    const res = await request(makeApp(false))
      .post("/addIssuer")
      .send({ address: "0x" + "3".repeat(40), name: "Universidad X" });
    expect(res.status).toBe(404);
  });

  test("removeIssuer NO existe cuando isDevAdmin=false → 404", async () => {
    const res = await request(makeApp(false))
      .post("/removeIssuer")
      .send({ address: "0x" + "3".repeat(40) });
    expect(res.status).toBe(404);
  });
});
