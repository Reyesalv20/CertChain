'use client';

// Ruta protegida: "/certificados" (requiere sesión, ver middleware.ts)
// Lista TODOS los certificados de la institución del usuario. Cada uno enlaza a
// su vista de detalle (editar metadata / revocar) y a la verificación pública.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { Certificado } from '@/lib/types';

const COLOR_ESTADO: Record<string, { fg: string; bg: string; bd: string }> = {
  registrado: { fg: '#1a7a4a', bg: '#f0faf4', bd: '#bce6cd' },
  revocado: { fg: '#c0392b', bg: '#fdf4f3', bd: '#f1c4bf' },
  pendiente: { fg: '#b45309', bg: '#fdf6ec', bd: '#f3dcb3' },
};

export default function CertificadosListaPage() {
  const [certs, setCerts] = useState<Certificado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    setCargando(true);
    api
      .listarCertificadosInstitucion()
      .then((lista) => {
        setCerts(lista);
        setError('');
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los certificados.'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(cargar, [cargar]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2 font-mono uppercase tracking-widest">
            <span>Portal institucional</span>
            <span>/</span>
            <span className="text-steel">Certificados</span>
          </div>
          <h1 className="font-display text-navy text-3xl mb-1">Mis certificados</h1>
          <p className="text-gray-500 text-sm">Todos los certificados emitidos por tu institución.</p>
        </div>
        <Link
          href="/certificados/emitir"
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-sm bg-navy no-underline"
        >
          + Emitir nuevo
        </Link>
      </div>

      {error && <p className="text-xs text-red-600 mb-4">{error}</p>}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : certs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-sm p-8 text-center">
          <p className="text-sm text-gray-400 mb-2">Todavía no emitiste certificados.</p>
          <Link href="/certificados/emitir" className="text-sm text-steel hover:underline">
            Emitir el primero →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {certs.map((c) => {
            const color = COLOR_ESTADO[c.estado] ?? COLOR_ESTADO.pendiente;
            return (
              <div
                key={c.id}
                className="bg-white border border-gray-200 rounded-sm px-5 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.nombreEstudiante}</p>
                  <p className="text-xs text-gray-400 font-mono truncate">
                    {c.codigo} · {c.carrera || '—'} · {c.fechaEmision || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide"
                    style={{ color: color.fg, backgroundColor: color.bg, borderColor: color.bd }}
                  >
                    {c.estado}
                  </span>
                  <Link href={`/verificar?codigo=${c.codigo}`} className="text-xs text-gray-500 hover:text-navy">
                    Verificar
                  </Link>
                  <Link
                    href={`/certificados/${c.id}`}
                    className="px-3 py-1.5 text-xs font-semibold text-white rounded-sm bg-navy no-underline"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
