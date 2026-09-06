'use client';

// Admin: todos los certificados (filtro por institución y estado).
// Consume GET /admin/certificados?institucion_id=... (docs/API_CONTRACT.md).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { Certificado, InstitucionAdmin } from '@/lib/types';

export default function AdminCertificadosPage() {
  const [items, setItems] = useState<Certificado[]>([]);
  const [instituciones, setInstituciones] = useState<InstitucionAdmin[]>([]);
  const [institucionId, setInstitucionId] = useState('');
  const [estado, setEstado] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.obtenerInstituciones().then(setInstituciones).catch(() => setInstituciones([]));
  }, []);

  const cargar = useCallback(() => {
    setCargando(true);
    setError('');
    const promesa = institucionId
      ? api.obtenerCertificadosAdmin(Number(institucionId))
      : api.obtenerCertificadosAdmin();
    promesa
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los certificados.'))
      .finally(() => setCargando(false));
  }, [institucionId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtrados = estado ? items.filter((c) => c.estado === estado) : items;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-8 font-mono uppercase tracking-widest">
        <span>Administración</span>
        <span>/</span>
        <span className="text-steel">Certificados</span>
      </div>
      <h1 className="font-display text-navy text-3xl mb-6">Certificados</h1>

      {error && <p className="text-xs text-red-600 mb-4">{error}</p>}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Institución:</span>
          <select
            value={institucionId}
            onChange={(e) => setInstitucionId(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-sm outline-none"
          >
            <option value="">Todas</option>
            {instituciones.map((i) => (
              <option key={i.institucion_id} value={i.institucion_id}>
                {i.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Estado:</span>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-sm outline-none"
          >
            <option value="">Todos</option>
            <option value="registrado">Registrado</option>
            <option value="revocado">Revocado</option>
          </select>
        </div>
      </div>

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-gray-400">Sin certificados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-sm px-5 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{c.nombreEstudiante}</p>
                <p className="text-xs text-gray-400 font-mono">
                  {c.codigo} · {c.institucion ?? '—'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full border ${
                    c.estado === 'revocado'
                      ? 'text-red-700 bg-red-50 border-red-200'
                      : 'text-green-700 bg-green-50 border-green-200'
                  }`}
                >
                  {c.estado}
                </span>
                <Link href={`/verificar?codigo=${c.codigo}`} className="text-xs text-steel hover:underline">
                  Ver
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
