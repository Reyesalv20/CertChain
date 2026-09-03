// Tipos compartidos entre las páginas del frontend.
// Deben reflejar exactamente lo que devuelve el backend (NestJS, puerto 4000).
// Si el backend cambia la forma de una respuesta, actualizar aquí también.

export interface Institucion {
  id: string;
  nombre: string;
  email: string;
}

export type EstadoCertificado = 'pendiente' | 'registrado';

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