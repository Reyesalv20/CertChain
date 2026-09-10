'use client';

// Admin: vista individual de una credencial física (RFID).
// Permite editar sus campos (menos el id) y gestionar los certificados
// vinculados: verlos, agregarlos y quitarlos.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useBluetoothRfid } from '@/hooks/useBluetoothRfid';
import { BluetoothLectorStatus } from '@/components/BluetoothLectorStatus';
import type { Certificado, CredencialFisica } from '@/lib/types';

export default function CredencialDetallePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);

  const [credencial, setCredencial] = useState<CredencialFisica | null>(null);
  const [disponibles, setDisponibles] = useState<Certificado[]>([]);
  const [form, setForm] = useState({ uidRfid: '', fechaEmisionFisica: '' });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  // Al escanear una credencial por Bluetooth, prellena el campo UID del formulario.
  const {
    conectado: btConectado,
    conectando: btConectando,
    error: btError,
    conectar: btConectar,
    desconectar: btDesconectar,
    soportado: btSoportado,
  } = useBluetoothRfid({
    onUid: (uid) => setForm((prev) => ({ ...prev, uidRfid: uid })),
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const cd = await api.obtenerCredencial(id);
      setCredencial(cd);
      setForm({
        uidRfid: cd.uid_rfid ?? '',
        fechaEmisionFisica: (cd.fechaEmisionFisica ?? '').slice(0, 10),
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la credencial.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
    api
      .obtenerCertificadosAdmin()
      .then(setDisponibles)
      .catch(() => setDisponibles([]));
  }, [cargar]);

  async function guardar() {
    if (!credencial || busy) return;
    setBusy(true);
    setError('');
    setOk('');
    try {
      const actualizada = await api.actualizarCredencial(credencial.credencial_id, {
        uidRfid: form.uidRfid,
        fechaEmisionFisica: form.fechaEmisionFisica,
      });
      setCredencial(actualizada);
      setForm({
        uidRfid: actualizada.uid_rfid ?? '',
        fechaEmisionFisica: (actualizada.fechaEmisionFisica ?? '').slice(0, 10),
      });
      setOk('Credencial actualizada.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo actualizar la credencial.');
    } finally {
      setBusy(false);
    }
  }

  const vinculados = new Set((credencial?.certificados ?? []).map((c) => c.id));
  const candidatos = disponibles.filter((c) => !vinculados.has(c.id));
  const [selCert, setSelCert] = useState('');

  async function vincular() {
    if (!selCert || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.vincularCertificadoACredencial(id, selCert);
      setSelCert('');
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo vincular el certificado.');
    } finally {
      setBusy(false);
    }
  }

  async function quitar(certId: string) {
    setBusy(true);
    setError('');
    try {
      await api.desvincularCertificadoDeCredencial(id, certId);
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo quitar el certificado.');
    } finally {
      setBusy(false);
    }
  }

  if (cargando && !credencial) return <div className="max-w-4xl mx-auto px-6 py-10 text-sm text-gray-400">Cargando...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-8 font-mono uppercase tracking-widest">
        <Link href="/admin/credenciales" className="hover:text-steel">Administración / Credenciales físicas</Link>
        <span>/</span>
        <span className="text-steel">{credencial?.uid_rfid ?? `#${id}`}</span>
      </div>

      {error && <p className="text-xs text-red-600 mb-4">{error}</p>}
      {ok && <p className="text-xs text-green-600 mb-4">{ok}</p>}

      {credencial && (
        <div className="flex flex-col gap-6">
          {/* Campos editables (menos el id) */}
          <section className="bg-white border border-gray-200 rounded-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-gray-700">Datos de la credencial</h2>
              <BluetoothLectorStatus
                conectado={btConectado}
                conectando={btConectando}
                soportado={btSoportado}
                error={btError}
                onConectar={btConectar}
                onDesconectar={btDesconectar}
              />
            </div>
            <p className="text-xs text-gray-400 mb-4">ID interno: #{credencial.credencial_id} (no editable)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">UID RFID *</label>
                <input
                  value={form.uidRfid}
                  onChange={(e) => setForm({ ...form, uidRfid: e.target.value })}
                  placeholder="UID de la credencial"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Fecha de emisión física</label>
                <input
                  value={form.fechaEmisionFisica}
                  onChange={(e) => setForm({ ...form, fechaEmisionFisica: e.target.value })}
                  type="date"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none"
                />
              </div>
            </div>
            <button
              onClick={guardar}
              disabled={busy}
              className="mt-4 px-4 py-2 text-sm font-semibold text-white rounded-sm border-none disabled:opacity-50"
              style={{ backgroundColor: '#1F4E5F' }}
            >
              {busy ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </section>

          {/* Certificados vinculados */}
          <section className="bg-white border border-gray-200 rounded-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Certificados vinculados ({credencial.certificados.length})
            </h2>

            {credencial.certificados.length === 0 ? (
              <p className="text-xs text-gray-400 mb-4">Sin certificados vinculados.</p>
            ) : (
              <div className="flex flex-col gap-2 mb-4">
                {credencial.certificados.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border border-gray-100 rounded-sm px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 truncate">{c.nombreEstudiante}</p>
                      <p className="text-xs text-gray-400 font-mono truncate">
                        {c.codigo} · {c.institucion ?? '—'} · {c.estado}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <Link href={`/verificar?codigo=${c.codigo}`} className="text-xs text-steel hover:underline">
                        Verificar
                      </Link>
                      <button
                        onClick={() => quitar(c.id)}
                        disabled={busy}
                        className="text-xs text-red-600 hover:text-red-700 bg-transparent border-none cursor-pointer disabled:opacity-50"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Agregar certificado */}
            <div className="flex flex-col gap-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500">
                Agregar certificado
              </label>
              <div className="flex gap-2">
                <select
                  value={selCert}
                  onChange={(e) => setSelCert(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none bg-white"
                >
                  <option value="">Seleccioná un certificado (solo muestra no vinculados)...</option>
                  {candidatos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} — {c.nombreEstudiante}
                      {c.institucion ? ` (${c.institucion})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={vincular}
                  disabled={busy || !selCert}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-sm border-none disabled:opacity-50"
                  style={{ backgroundColor: '#1F4E5F' }}
                >
                  Vincular
                </button>
              </div>
              {candidatos.length === 0 && (
                <p className="text-[11px] text-gray-400">No hay más certificados sin credencial para vincular.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
