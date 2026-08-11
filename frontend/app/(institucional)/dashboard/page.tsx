'use client';

// Ruta protegida: "/dashboard" (requiere cookie certchain_token, ver middleware.ts)
// Llama a GET /certificados/estadisticas y GET /certificados/recientes.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BlockchainIcon } from '@/components/icons';
import { api } from '@/lib/api';
import type { ActividadReciente, EstadisticasDashboard } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<EstadisticasDashboard | null>(null);
  const [recientes, setRecientes] = useState<ActividadReciente[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([api.obtenerEstadisticas().catch(() => null), api.obtenerRecientes().catch(() => [])]).then(
      ([statsResult, recientesResult]) => {
        setStats(statsResult);
        setRecientes(recientesResult);
        setCargando(false);
      },
    );
  }, []);

  const tarjetas = [
    { label: 'Certificados emitidos', value: stats?.total ?? '—' },
    { label: 'Este mes', value: stats?.esteMes ?? '—' },
    { label: 'Pendientes de registro', value: stats?.pendientes ?? '—' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-navy text-3xl mb-1">Panel institucional</h1>
          <p className="text-gray-500 text-sm">Resumen de certificados emitidos y estado del sistema.</p>
        </div>
        <Link
          href="/certificados"
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-sm bg-navy"
        >
          <BlockchainIcon size={16} />
          Emitir certificado
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {tarjetas.map((t) => (
          <div key={t.label} className="bg-white border border-gray-200 rounded-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{t.label}</p>
            <p className="font-display text-navy text-3xl">{cargando ? '—' : t.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-sm">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 px-6 py-4 border-b border-gray-100">
          Actividad reciente
        </h3>
        {cargando ? (
          <p className="text-xs text-gray-400 px-6 py-6">Cargando...</p>
        ) : recientes.length === 0 ? (
          <p className="text-xs text-gray-400 px-6 py-6">Todavía no hay certificados emitidos.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {recientes.map((r) => (
              <div key={r.codigo} className="flex items-center justify-between px-6 py-3.5">
                <div>
                  <p className="font-mono text-xs text-steel">{r.codigo}</p>
                  <p className="text-sm text-gray-700 mt-0.5">{r.nombreEstudiante}</p>
                </div>
                <p className="text-xs text-gray-400">{r.fecha}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
