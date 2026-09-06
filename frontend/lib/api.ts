// Cliente HTTP hacia el backend (NestJS, puerto 4000).
//
// Todas las llamadas de aquí corren en el navegador del usuario (componentes
// "use client"), por lo que SIEMPRE deben usar NEXT_PUBLIC_BACKEND_URL, nunca
// BACKEND_INTERNAL_URL (ese es solo para código que corre dentro del contenedor).
//
// El frontend nunca llama directo a blockchain-service ni a llm-service:
// todo pasa por el backend, que es el único punto de entrada (ver README raíz).
//
// Contrato completo de endpoints esperados: ver frontend/API_CONTRACT.md

import type {
  ActividadReciente,
  Certificado,
  CredencialFisica,
  CredencialVinculada,
  CredencialesLogin,
  DatosConfirmacionCertificado,
  DetalleInstitucion,
  EstadisticasDashboard,
  Institucion,
  InstitucionAdmin,
  MetadataCertificado,
  ResultadoTarjeta,
  ResultadoVerificacion,
  SubidaCertificado,
  UsuarioAdmin,
  WalletInstitucion,
} from './types';
import { createClient } from './supabase/client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Intenta de nuevo en unos segundos.', 0);
  }

  if (!response.ok) {
    let message = `Error del servidor (${response.status})`;
    try {
      const body = await response.json();
      message = body?.message ?? message;
    } catch {
      // el backend no devolvió JSON, se usa el mensaje genérico
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  // POST /auth/login
  // Body: { email, password }
  // El backend valida credenciales y responde con Set-Cookie: certchain_token (httpOnly).
  login(credenciales: CredencialesLogin): Promise<{ institucion: Institucion }> {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credenciales),
    });
  },

  // POST /auth/logout — limpia la cookie certchain_token en el backend.
  logout(): Promise<void> {
    return apiFetch('/auth/logout', { method: 'POST' });
  },


  // POST /certificados/subir (protegido)
  // multipart/form-data con el campo "archivo" (PDF).
  // El backend guarda el archivo y devuelve los datos que se prellenan en el formulario
  // (puede ser extracción automática o, si no es viable, valores vacíos para llenado manual).
  // exactamente igual que como estab en la rama kelvin/frontend-metamask
  procesarCertificado(archivo: File): Promise<SubidaCertificado> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return apiFetch('/certificados/procesar', { method: 'POST', body: formData,});
  },

  // POST /certificados (protegido)
  // Registra el certificado: genera hash SHA-256 y lo inscribe en blockchain
  // (el backend llama internamente a blockchain-service).
  confirmarCertificado(datos: DatosConfirmacionCertificado): Promise<Certificado> {
    return apiFetch('/certificados/confirmar', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  },

  // GET /certificados/recientes (protegido) — para el sidebar de actividad y el dashboard
  obtenerRecientes(): Promise<ActividadReciente[]> {
    return apiFetch('/certificados/recientes');
  },

  // GET /certificados/estadisticas (protegido) — tarjetas resumen del dashboard
  obtenerEstadisticas(): Promise<EstadisticasDashboard> {
    return apiFetch('/certificados/estadisticas');
  },

  // GET /certificados/verificar?codigo=... (público)
  verificarCertificado(codigo: string): Promise<ResultadoVerificacion> {
    return apiFetch(`/certificados/verificar?codigo=${encodeURIComponent(codigo)}`);
  },

  // GET /certificados/obtenerMetadataPorHash?hash=... (público)
  // Devuelve la metadata del certificado desde Supabase (vía backend).
  async obtenerMetadataPorHash(hash: string): Promise<MetadataCertificado | null> {
    const data = await apiFetch<{
      valido: boolean;
      certificado?: {
        codigo: string;
        nombreEstudiante: string;
        carrera: string;
        fechaEmision: string;
        institucion: string | null;
      };
    }>(`/certificados/obtenerMetadataPorHash?hash=${encodeURIComponent(hash)}`);

    if (!data.valido || !data.certificado) return null;

    return {
      nombreEstudiante: data.certificado.nombreEstudiante,
      carrera: data.certificado.carrera,
      institucion: data.certificado.institucion ?? '—',
      fechaEmision: data.certificado.fechaEmision,
      codigo: data.certificado.codigo,
    };
  },

  // GET /certificados/por-rfid/:uid (público)
  // Devuelve los certificados asociados a una credencial física (tarjeta RFID).
  obtenerPorTarjeta(uid: string): Promise<ResultadoTarjeta> {
    return apiFetch(`/certificados/por-rfid/${encodeURIComponent(uid)}`);
  },

  // ── Admin: instituciones ────────────────────────────────────
  obtenerInstituciones(): Promise<InstitucionAdmin[]> {
    return apiFetch('/admin/instituciones');
  },
  obtenerInstitucion(id: number): Promise<DetalleInstitucion> {
    return apiFetch(`/admin/instituciones/${id}`);
  },
  crearInstitucion(nombre: string): Promise<InstitucionAdmin> {
    return apiFetch('/admin/instituciones', { method: 'POST', body: JSON.stringify({ nombre }) });
  },
  eliminarInstitucion(id: number): Promise<void> {
    return apiFetch(`/admin/instituciones/${id}`, { method: 'DELETE' });
  },

  // ── Admin: wallets de una institución ───────────────────────
  obtenerWalletsInstitucion(id: number): Promise<WalletInstitucion[]> {
    return apiFetch(`/admin/instituciones/${id}/wallets`);
  },
  agregarWalletInstitucion(id: number, datos: { address: string; etiqueta?: string }): Promise<WalletInstitucion> {
    return apiFetch(`/admin/instituciones/${id}/wallets`, { method: 'POST', body: JSON.stringify(datos) });
  },
  eliminarWalletInstitucion(id: number, walletId: number): Promise<void> {
    return apiFetch(`/admin/instituciones/${id}/wallets/${walletId}`, { method: 'DELETE' });
  },

  // ── Admin: usuarios ─────────────────────────────────────────
  obtenerUsuarios(): Promise<UsuarioAdmin[]> {
    return apiFetch('/admin/usuarios');
  },
  obtenerUsuariosInstitucion(id: number): Promise<UsuarioAdmin[]> {
    return apiFetch(`/admin/instituciones/${id}/usuarios`);
  },
  crearUsuario(datos: { email: string; password: string; nombre: string; rol: string; institucionId?: number | null }): Promise<UsuarioAdmin> {
    return apiFetch('/admin/usuarios', { method: 'POST', body: JSON.stringify(datos) });
  },
  eliminarUsuario(usuarioId: string): Promise<void> {
    return apiFetch(`/admin/usuarios/${usuarioId}`, { method: 'DELETE' });
  },

  // ── Admin: certificados (todos / por institución) ──────────
  obtenerCertificadosAdmin(institucionId?: number): Promise<Certificado[]> {
    return apiFetch(`/admin/certificados${institucionId ? `?institucion_id=${institucionId}` : ''}`);
  },

  // ── Admin: tarjetas (credenciales físicas RFID) ────────────
  obtenerCredenciales(): Promise<CredencialFisica[]> {
    return apiFetch('/admin/credenciales');
  },

  // ── Vincular tarjetas (RFID) a un certificado ───────────────
  vincularCredencial(certId: string, uidRfid: string): Promise<CredencialVinculada> {
    return apiFetch(`/admin/certificados/${certId}/credenciales`, {
      method: 'POST',
      body: JSON.stringify({ uid: uidRfid }),
    });
  },
  desvincularCredencial(certId: string, credencialId: number): Promise<void> {
    return apiFetch(`/admin/certificados/${certId}/credenciales/${credencialId}`, { method: 'DELETE' });
  },

  // POST /chat (público)
  // Body: { pregunta, codigoCertificado }
  // El backend reenvía la pregunta a llm-service (RAG sobre el certificado indicado).
  preguntarAsistente(pregunta: string, codigoCertificado: string): Promise<{ respuesta: string }> {
    return apiFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({ pregunta, codigoCertificado }),
    });
  },
};
