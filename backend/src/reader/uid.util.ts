// backend/src/reader/uid.util.ts

// Normaliza un UID leído de un lector RFID al formato canónico usado en la DB
// (credenciales_fisicas.uid_rfid): mayúsculas, sin "0x", espacios ni separadores.
// Devuelve null si el valor no es hexadecimal.
export function normalizarUid(valor?: string): string | null {
  if (!valor) return null;
  let v = valor.trim();
  v = v.replace(/^0x/i, '');
  v = v.replace(/[\s:;,._/-]/g, '');
  v = v.toUpperCase();

  if (!/^[0-9A-F]+$/.test(v)) return null;
  if (v.length < 4 || v.length > 64) return null; // evita abuso
  return v;
}
