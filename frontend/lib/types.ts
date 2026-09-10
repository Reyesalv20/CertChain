// Tipos compartidos entre las páginas del frontend.
// Deben reflejar exactamente lo que devuelve el backend (NestJS, puerto 4000).
// Si el backend cambia la forma de una respuesta, actualizar aquí también.

export interface Institucion {
  id: string;
  nombre: string;
  email: string;
}

export type EstadoCertificado = 'pendiente' | 'registrado' | 'revocado';

export interface Certificado {
  id: string;
  codigo: string; // ej. "UAX-2024-0847-MENG"
  nombreEstudiante: string;
  carrera: string;
  fechaEmision: string; // ISO date (YYYY-MM-DD)
  institucion?: string;
  hash: string; // SHA-256 del documento
  rfid?: string;
  estado: EstadoCertificado;
}

export interface ResultadoVerificacion {
  valido: boolean;
  certificado?: Certificado;
}

export interface ActividadReciente {
  codigo: string;
  nombreEstudiante: string;
  fecha: string;
}

export interface EstadisticasDashboard {
  total: number;
  esteMes: number;
  pendientes: number;
}

export interface MensajeChat {
  rol: 'usuario' | 'bot';
  texto: string;
}

// Respuesta del primer paso de emisión: el backend recibe el PDF,
// lo guarda/parsea y devuelve los datos que se prellenan en el formulario.
export interface SubidaCertificado {
  subidaId: string;
  hash: string;
  nombreEstudiante: string;
  carrera: string;
  fechaEmision: string;
  archivoNombre: string;
}

export interface DatosConfirmacionCertificado {
  subidaId: string;
  hash: string;
  txHash: string;
  nombreEstudiante: string;
  carrera: string;
  fechaEmision: string;
  archivoNombre: string;
}

// Metadata del certificado guardada en Supabase (vía backend).
// Mientras el backend no la exponga por hash, se mockea en lib/api.ts.
export interface MetadataCertificado {
  nombreEstudiante: string;
  carrera: string;
  institucion: string;
  fechaEmision: string;
  codigo: string;
}

export interface CredencialesLogin {
  email: string;
  password: string;
}

// ── Tarjetas / credenciales físicas (RFID) ──────────────────
// Contrato de GET /certificados/por-rfid/:uid (ver docs/API_CONTRACT.md).
export interface CertificadoTarjeta {
  id: string;
  codigo: string;
  nombreEstudiante: string;
  carrera: string;
  fechaEmision: string;
  institucion: string;
  hash: string;
  estado: string;
}

// El backend responde distinto según si esa tarjeta (UID) ya tiene una fila
// en credenciales_fisicas o no:
//   - nunca se registró -> { valido: false, mensaje }
//   - registrada (con o sin certificados) -> { valido: true, credencial, certificados }
export interface ResultadoTarjetaEncontrada {
  valido: true;
  credencial: { id: string; uid: string; codigo: string | null; fechaEmisionFisica: string | null };
  certificados: CertificadoTarjeta[];
}

export interface ResultadoTarjetaNoRegistrada {
  valido: false;
  mensaje: string;
}

export type ResultadoTarjeta = ResultadoTarjetaEncontrada | ResultadoTarjetaNoRegistrada;

// ── Admin: instituciones, wallets, usuarios ─────────────────
// Coinciden con el contrato de /admin/* (docs/API_CONTRACT.md).
export interface InstitucionAdmin {
  institucion_id: number;
  nombre: string;
  wallet_address?: string | null;
}

export interface DetalleInstitucion extends InstitucionAdmin {
  cantCertificados?: number;
}

export interface WalletInstitucion {
  wallet_id: number;
  institucion_id?: number;
  address: string;
  etiqueta: string | null;
}

export interface UsuarioAdmin {
  usuario_id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'institucional';
  institucion_id: number | null;
}

// Respuesta de GET /auth/me (backend). Se usa tras el login para redirigir
// según el rol del usuario.
export interface UsuarioMe {
  id: number;
  authUserId: string;
  rol: 'admin' | 'institucional';
  institucionId: number | null;
  nombre: string | null;
}

export interface RespuestaMe {
  usuario: UsuarioMe;
  institucion: { institucion_id: number; nombre: string } | null;
}

export interface CredencialVinculada {
  credencial_id: number;
  uid_rfid: string;
  etiqueta: string | null;
}

// Una credencial física (RFID) con los certificados a los que está vinculada
// (muchos-a-muchos vía certificados_credenciales). GET /admin/credenciales.
export interface CredencialFisica {
  credencial_id: number;
  uid_rfid: string;
  codigo: string | null;
  fechaEmisionFisica: string | null;
  institucion?: string | null;
  certificados: CertificadoTarjeta[];
}

//Agregando 2 nuevas interfaces para el hasheo y emision de certificado

export interface SubidaCertificado {
  subidaId: string;
  hash: string;
  nombreEstudiante: string;
  carrera: string;
  fechaEmision: string;
  archivoNombre: string;
}

export interface DatosConfirmacionCertificado {
  subidaId: string;
  hash: string;
  txHash: string;
  nombreEstudiante: string;
  carrera: string;
  fechaEmision: string;
  archivoNombre: string;
}