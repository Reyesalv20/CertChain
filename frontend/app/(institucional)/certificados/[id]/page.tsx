'use client';

// Ruta protegida: "/certificados/[id]" (requiere sesión)
// Detalle de un certificado de la institución: ver datos, editar la metadata
// off-chain y revocarlo (firma on-chain con la wallet emisora).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { WalletPanel } from '@/components/WalletPanel';
import { useWallet } from '@/hooks/useWallet';
import { api, ApiError } from '@/lib/api';
import { revocarCertificadoOnChain } from '@/lib/wallet';
import type { Certificado } from '@/lib/types';

export default function CertificadoDetallePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const { cuenta } = useWallet();

  const [cert, setCert] = useState<Certificado | null>(null);
  const [form, setForm] = useState({ nombreEstudiante: '', carrera: '', fechaEmision: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [revocando, setRevocando] = useState(false);
  const [txRevocacion, setTxRevocacion] = useState('');

  const cargar = useCallback(async () => {
    try {
      const c = await api.obtenerCertificadoInstitucional(id);
      setCert(c);
      setForm({
        nombreEstudiante: c.nombreEstudiante ?? '',
        carrera: c.carrera ?? '',
        fechaEmision: (c.fechaEmision ?? '').slice(0, 10),
      });
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el certificado.');
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar() {
    if (!cert || busy) return;
    setBusy(true);
    setError('');
    setOk('');
    try {
      const actualizado = await api.actualizarCertificadoInstitucional(cert.id, form);
      setCert(actualizado);
      setForm({
        nombreEstudiante: actualizado.nombreEstudiante ?? '',
        carrera: actualizado.carrera ?? '',
        fechaEmision: (actualizado.fechaEmision ?? '').slice(0, 10),
      });
      setOk('Metadata actualizada.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo actualizar la metadata.');
    } finally {
      setBusy(false);
    }
  }

  async function revocar() {
    if (!cert || cert.estado === 'revocado' || revocando) return;
    if (!cuenta) {
      setError('Conectá la wallet emisora (panel derecho) para firmar la revocación.');
      return;
    }
    if (!window.confirm(`¿Revocar el certificado ${cert.codigo}? Esta acción es permanente en blockchain.`)) return;

    setRevocando(true);
    setError('');
    setOk('');
    try {
      // 1) Revocar on-chain (solo el emisor original o el admin del registry).
      const tx = await revocarCertificadoOnChain(cert.hash);
      setTxRevocacion(tx);
      // 2) Marcar estado en la base.
      const actualizado = await api.revocarCertificadoInstitucional(cert.id);
      setCert(actualizado);
      setOk('Certificado revocado.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo revocar el certificado.');
    } finally {
      setRevocando(false);
    }
  }

  const revocado = cert?.estado === 'revocado';

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-8 font-mono uppercase tracking-widest">
        <Link href="/certificados" className="hover:text-steel">Portal institucional / Certificados</Link>
        <span>/</span>
        <span className="text-steel">{cert?.codigo ?? `#${id}`}</span>
      </div>

      {error && <p className="text-xs text-red-600 mb-4">{error}</p>}
      {ok && <p className="text-xs text-green-600 mb-4">{ok}</p>}

      {!cert && !error && <p className="text-sm text-gray-400">Cargando...</p>}

      {cert && (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
              <h1 className="font-display text-navy text-3xl">{cert.nombreEstudiante}</h1>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full border uppercase tracking-wide ${
                  revocado ? 'text-red-700 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'
                }`}
              >
                {cert.estado}
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-6">
              {cert.institucion ?? '—'} · Código <span className="font-mono">{cert.codigo}</span>
            </p>

            {revocado && (
              <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 mb-6">
                <p className="text-red-700 text-xs">
                  Este certificado fue revocado on-chain. Ya no puede considerarse válido.
                </p>
              </div>
            )}

            {/* Editar metadata */}
            <section className="bg-white border border-gray-200 rounded-sm p-5 mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Datos del certificado</h2>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">
                      Estudiante
                    </label>
                    <input
                      value={form.nombreEstudiante}
                      onChange={(e) => setForm({ ...form, nombreEstudiante: e.target.value })}
                      disabled={revocado}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">
                      Fecha de titulación
                    </label>
                    <input
                      type="date"
                      value={form.fechaEmision}
                      onChange={(e) => setForm({ ...form, fechaEmision: e.target.value })}
                      disabled={revocado}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">
                    Carrera / Programa
                  </label>
                  <input
                    value={form.carrera}
                    onChange={(e) => setForm({ ...form, carrera: e.target.value })}
                    disabled={revocado}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <p className="text-[11px] text-gray-400">
                  Solo cambia la metadata en la base; el hash del documento y su registro on-chain no cambian.
                </p>
                <button
                  onClick={guardar}
                  disabled={busy || revocado}
                  className="self-start px-4 py-2 text-sm font-semibold text-white rounded-sm border-none disabled:opacity-50"
                  style={{ backgroundColor: '#1F4E5F' }}
                >
                  {busy ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </section>

            {/* Revocar */}
            {!revocado && (
              <section className="bg-white border border-gray-200 rounded-sm p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-2 text-red-700">Zona de riesgo</h2>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  Revocar invalida el certificado on-chain de forma permanente. Solo puede hacerlo la{' '}
                  <strong>wallet que lo emitió</strong> (o el ente regulador). La transacción se firma en el panel
                  derecho.
                </p>
                <button
                  onClick={revocar}
                  disabled={revocando}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-sm border-none disabled:opacity-50"
                  style={{ backgroundColor: '#c0392b' }}
                >
                  {revocando ? 'Revocando on-chain…' : 'Revocar certificado'}
                </button>
                {txRevocacion && (
                  <p className="text-xs text-gray-400 font-mono mt-3 break-all">tx: {txRevocacion}</p>
                )}
              </section>
            )}

            <div className="mt-6">
              <Link href={`/verificar?codigo=${cert.codigo}`} className="text-sm text-steel hover:underline">
                Verificar públicamente →
              </Link>
            </div>
          </div>

          <div className="lg:w-72 shrink-0">
            <div className="sticky top-24 flex flex-col gap-5">
              <WalletPanel />
              <div className="bg-white border border-gray-200 rounded-sm p-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Resumen</h3>
                <dl className="flex flex-col gap-2 text-xs">
                  <Campo label="Estado" valor={cert.estado} />
                  <Campo label="Carrera" valor={cert.carrera || '—'} />
                  <Campo label="Fecha" valor={cert.fechaEmision || '—'} />
                  <Campo label="Institución" valor={cert.institucion || '—'} />
                </dl>
                <p className="text-xs text-gray-400 font-mono break-all mt-3">Hash: {cert.hash}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-400 uppercase tracking-widest">{label}</dt>
      <dd className="text-gray-700 text-right font-medium">{valor}</dd>
    </div>
  );
}
