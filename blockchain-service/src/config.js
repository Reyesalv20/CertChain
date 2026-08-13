// Lectura y validación de variables de entorno.
// Falla rápido (exit 1) si falta algo obligatorio, con un mensaje claro.

function required(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    console.error(`ERROR: falta la variable de entorno ${name}`);
    process.exit(1);
  }
  return value;
}

module.exports = {
  rpcUrl: required("RPC_URL"),
  privateKey: required("PRIVATE_KEY"),
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY, // solo se usa si isDevAdmin
  contractAddress: required("CONTRACT_ADDRESS"),
  trustedIssuersAddress: required("TRUSTED_ISSUERS_ADDRESS"),
  port: process.env.PORT || 6000,
  // Flag de desarrollo: habilita addIssuer/removeIssuer firmados por el server.
  isDevAdmin: process.env.ENABLE_DEV_ADMIN === "true",
};
