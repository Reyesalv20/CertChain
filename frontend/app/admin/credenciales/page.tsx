'use client';

// Admin: tarjetas RFID (credenciales físicas).
// Una tarjeta puede estar vinculada a VARIOS certificados (certificados_credenciales).
// Consume GET /admin/credenciales (docs/API_CONTRACT.md).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { Certificado, CredencialFisica } from '@/lib/types';

export default function AdminCredencialesPage() {
  const [credenciales, setCredenciales] = useState<CredencialFisica[]>([]);
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [codigoPorTarjeta, setCodigoPorTarjeta] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    setCargando(true);
    Promise.all([api.obtenerCredenciales(), api.obtenerCertificadosAdmin()])
      .then(([creds, certs]) => {
        setCredenciales(creds);
        setCertificados(certs);
        setError('');
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las tarjetas.'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Resuelve el id de un certificado por su código (para vincular desde la tarjeta).
  const certPorCodigo = (codigo: string) => certificados.find((c) => c.codigo.toLowerCase() === codigo.toLowerCase());

  async function vincular(credencialId: number) {
    const codigo = codigoPorTarjeta[credencialId]?.trim();
    if (!codigo) return;
    const cert = certPorCodigo(codigo);
    if (!cert) {
      setError(`No se encontró un certificado con el código "${codigo}".`);
      return;
    }
    try {
      // Reusamos el endpoint que vincula una credencial a un certificado.
      await api.vincularCredencial(cert.id, credenciales.find((c) => c.credencial_id === credencialId)?.uid_rfid ?? '');
      setCodigoPorTarjeta((prev) => ({ ...prev, [credencialId]: '' }));
      cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo vincular el certificado.');
    }
  }

  async function desvincular(certId: string, credencialId: number) {
    try {
      await api.desvincularCredencial(certId, credencialId);
      cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo desvincular el certificado.');
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-8 font-mono uppercase tracking-widest">
        <span>Administración</span>
        <span>/</span>
        <span className="text-steel">Tarjetas RFID</span>
      </div>
      <h1 className="font-display text-navy text-3xl mb-6">Tarjetas (credenciales físicas)</h1>

      {error && <p className="text-xs text-red-600 mb-4">{error}</p>}

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : credenciales.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no hay tarjetas registradas.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {credenciales.map((cd) => (
            <div key={cd.credencial_id} className="bg-white border border-gray-200 rounded-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-mono text-sm font-semibold text-steel">{cd.uid_rfid}</p>
                  <p className="text-xs text-gray-400">
                    {cd.etiqueta ?? 'Sin etiqueta'}
                    {cd.institucion ? ` · ${cd.institucion}` : ''}
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-mono">{cd.certificados.length} certificado(s)</span>
              </div>

              {/* Certificados vinculados */}
              {cd.certificados.length > 0 ? (
                <div className="flex flex-col gap-2 mb-3">
                  {cd.certificados.map((c) => (
                    <div key={c.id} className="flex items-center justify-between border border-gray-100 rounded-sm px-3 py-2">
                      <div>
                        <p className="text-sm text-gray-800">{c.nombreEstudiante}</p>
                        <p className="text-xs text-gray-400 font-mono">
                          {c.codigo} · {c.institucion ?? '—'} · {c.estado}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <Link href={`/verificar?card_id=${cd.uid_rfid}`} className="text-xs text-steel hover:underline">
                          Verificar tarjeta
                        </Link>
                        <button onClick={() => desvincular(c.id, cd.credencial_id)} className="text-xs text-red-600 hover:text-red-700 bg-transparent border-none cursor-pointer">
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-3">Sin certificados vinculados.</p>
              )}

              {/* Vincular un certificado por código */}
              <div className="flex gap-2">
                <input
                  value={codigoPorTarjeta[cd.credencial_id] ?? ''}
                  onChange={(e) => setCodigoPorTarjeta((prev) => ({ ...prev, [cd.credencial_id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && vincular(cd.credencial_id)}
                  placeholder="Código de certificado a vincular (ej. UAX-...)"
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-sm outline-none font-mono"
                />
                <button onClick={() => vincular(cd.credencial_id)} className="px-3 py-1.5 text-xs font-semibold text-white rounded-sm border-none" style={{ backgroundColor: '#1F4E5F' }}>
                  Vincular certificado
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
