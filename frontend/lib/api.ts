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
  CredencialesLogin,
  DatosConfirmacionCertificado,
  EstadisticasDashboard,
  Institucion,
  MetadataCertificado,
  ResultadoVerificacion,
  SubidaCertificado,
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

confirmarCertificado(datos: DatosConfirmacionCertificado): Promise<Certificado> {
  return apiFetch('/certificados/confirmar', { method: 'POST', body: JSON.stringify(datos) });
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

  // Metadata del certificado por hash (público).
  // TODO: el backend aún no expone este endpoint (consulta Supabase por hash).
  // Mientras tanto devolvemos metadata dummy para que la UI funcione.
  obtenerMetadataPorHash(_certHash: string): Promise<MetadataCertificado> {
    return Promise.resolve({
      nombreEstudiante: 'María García López',
      carrera: 'Ingeniería en Sistemas Computacionales',
      institucion: 'Universidad Autónoma de Xalapa',
      fechaEmision: '2024-06-15',
      codigo: 'UAX-2024-0847-MENG',
    });
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
