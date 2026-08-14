// Helpers de validación de inputs.

const isValidBytes32 = (certHash) => {
  if (typeof certHash !== "string") return false;
  return /^0x[0-9a-fA-F]{64}$/.test(certHash);
};

const isValidAddress = (addr) => {
  if (typeof addr !== "string") return false;
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
};

module.exports = { isValidBytes32, isValidAddress };
