'use client';

// Admin: credenciales físicas (RFID).
// Enlista todas las credenciales con sus certificados vinculados y un botón
// "Gestionar" que lleva a la vista individual de cada credencial.
// Consume GET /admin/credenciales (docs/API_CONTRACT.md).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useBluetoothRfid } from '@/hooks/useBluetoothRfid';
import { BluetoothLectorStatus } from '@/components/BluetoothLectorStatus';
import type { CredencialFisica } from '@/lib/types';

function fechaCorta(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('es-MX') : '—';
}

export default function AdminCredencialesPage() {
  const [credenciales, setCredenciales] = useState<CredencialFisica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [nueva, setNueva] = useState({ uidRfid: '', fechaEmisionFisica: '' });

  // El lector por Bluetooth prellena el UID de la credencial al escanear.
  const {
    conectado: btConectado,
    conectando: btConectando,
    error: btError,
    conectar: btConectar,
    desconectar: btDesconectar,
    soportado: btSoportado,
  } = useBluetoothRfid({
    onUid: (uid) => setNueva((prev) => ({ ...prev, uidRfid: uid })),
  });

  const cargar = useCallback(() => {
    setCargando(true);
    api
      .obtenerCredenciales()
      .then((creds) => {
        setCredenciales(creds);
        setError('');
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las credenciales.'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function registrar() {
    const uid = nueva.uidRfid.trim();
    if (!uid || busy) {
      setError('El UID de la credencial es obligatorio.');
      return;
    }
    setBusy(true);
    setError('');
    setOk('');
    try {
      await api.crearCredencial({
        uidRfid: uid,
        fechaEmisionFisica: nueva.fechaEmisionFisica || undefined,
      });
      setNueva({ uidRfid: '', fechaEmisionFisica: '' });
      setOk('Credencial física registrada.');
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo registrar la credencial.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-8 font-mono uppercase tracking-widest">
        <span>Administración</span>
        <span>/</span>
        <span className="text-steel">Credenciales físicas</span>
      </div>
      <h1 className="font-display text-navy text-3xl mb-6">Credenciales físicas</h1>
      <p className="text-sm text-gray-400 mb-6">
        Cada credencial física (RFID) puede agrupar varios certificados vinculados.
      </p>

      {error && <p className="text-xs text-red-600 mb-4">{error}</p>}
      {ok && <p className="text-xs text-green-600 mb-4">{ok}</p>}

      {/* Alta de credencial física */}
      <section className="bg-white border border-gray-200 rounded-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Ingresar nueva credencial física</h2>
          <BluetoothLectorStatus
            conectado={btConectado}
            conectando={btConectando}
            soportado={btSoportado}
            error={btError}
            onConectar={btConectar}
            onDesconectar={btDesconectar}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">UID RFID *</label>
            <input
              value={nueva.uidRfid}
              onChange={(e) => setNueva({ ...nueva, uidRfid: e.target.value })}
              placeholder="UID de la credencial"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Fecha de emisión física</label>
            <input
              value={nueva.fechaEmisionFisica}
              onChange={(e) => setNueva({ ...nueva, fechaEmisionFisica: e.target.value })}
              type="date"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none"
            />
          </div>
        </div>
        <button
          onClick={registrar}
          disabled={busy || !nueva.uidRfid.trim()}
          className="mt-4 px-4 py-2 text-sm font-semibold text-white rounded-sm border-none disabled:opacity-50"
          style={{ backgroundColor: '#1F4E5F' }}
        >
          {busy ? 'Registrando...' : 'Registrar credencial'}
        </button>
      </section>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Credenciales registradas</h2>

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : credenciales.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no hay credenciales físicas registradas.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {credenciales.map((cd) => (
            <div key={cd.credencial_id} className="bg-white border border-gray-200 rounded-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-steel break-all">{cd.uid_rfid}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {cd.codigo ? `Código: ${cd.codigo} · ` : ''}
                    Emitida: {fechaCorta(cd.fechaEmisionFisica)}
                    {cd.institucion ? ` · ${cd.institucion}` : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {cd.certificados.length} certificado(s) vinculado(s)
                  </p>
                </div>
                <Link
                  href={`/admin/credenciales/${cd.credencial_id}`}
                  className="px-4 py-2 text-xs font-semibold text-white rounded-sm border-none no-underline shrink-0"
                  style={{ backgroundColor: '#1F4E5F' }}
                >
                  Gestionar
                </Link>
              </div>

              {/* Certificados vinculados */}
              {cd.certificados.length > 0 ? (
                <div className="flex flex-col gap-2 mt-4">
                  {cd.certificados.map((c) => (
                    <div key={c.id} className="flex items-center justify-between border border-gray-100 rounded-sm px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 truncate">{c.nombreEstudiante}</p>
                        <p className="text-xs text-gray-400 font-mono truncate">
                          {c.codigo} · {c.institucion ?? '—'} · {c.estado}
                        </p>
                      </div>
                      <Link href={`/verificar?codigo=${c.codigo}`} className="text-xs text-steel hover:underline shrink-0 ml-2">
                        Verificar
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-4">Sin certificados vinculados.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
