'use client';

// Panel para vincular una tarjeta RFID (por su UID) a un certificado propio
// de la institución logueada. Se usa en /verificar cuando:
//   - la tarjeta no tiene ningún certificado vinculado ("vincular por primera vez"), o
//   - el usuario quiere agregar un certificado más a una tarjeta que ya tiene otros.
//
// Si no hay sesión, ofrece ir a /login (y volver acá mismo al terminar).
// Si hay sesión, deja elegir uno de los certificados de la institución o
// crear uno nuevo (y vincularlo automáticamente al terminar de emitirlo).

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { api, ApiError } from '@/lib/api';
import type { Certificado } from '@/lib/types';

export function VincularTarjetaPanel({
  uid,
  modo,
  onVinculado,
}: {
  uid: string;
  modo: 'primeraVez' | 'agregarOtro';
  onVinculado: () => void;
}) {
  const router = useRouter();
  const [revisandoSesion, setRevisandoSesion] = useState(true);
  const [autenticado, setAutenticado] = useState(false);
  const [certificados, setCertificados] = useState<Certificado[] | null>(null);
  const [filtro, setFiltro] = useState('');
  const [vinculandoId, setVinculandoId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [abierto, setAbierto] = useState(modo === 'primeraVez');

  useEffect(() => {
    let cancelado = false;
    createClient()
      .auth.getSession()
      .then((resultado: { data: { session: unknown } }) => {
        if (cancelado) return;
        setAutenticado(!!resultado.data.session);
        setRevisandoSesion(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!autenticado || !abierto || certificados !== null) return;
    api
      .listarCertificadosInstitucion()
      .then(setCertificados)
      .catch(() => setCertificados([]));
  }, [autenticado, abierto, certificados]);

  const filtrados = useMemo(() => {
    if (!certificados) return [];
    const q = filtro.trim().toLowerCase();
    if (!q) return certificados.slice(0, 6);
    return certificados
      .filter(
        (c) =>
          c.codigo.toLowerCase().includes(q) ||
          c.nombreEstudiante.toLowerCase().includes(q) ||
          c.carrera.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [certificados, filtro]);

  function irALogin() {
    router.push(`/login?redirect=${encodeURIComponent(`/verificar?card_id=${uid}`)}`);
  }

  function irACrearCertificado() {
    router.push(`/certificados/emitir?uid=${encodeURIComponent(uid)}`);
  }

  async function vincular(cert: Certificado) {
    setVinculandoId(cert.id);
    setError('');
    setOk('');
    try {
      await api.vincularTarjetaPropia(cert.id, uid);
      setOk(`Vinculado a ${cert.nombreEstudiante} (${cert.codigo}).`);
      onVinculado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo vincular el certificado.');
    } finally {
      setVinculandoId(null);
    }
  }

  const titulo = modo === 'primeraVez' ? 'Vincular esta tarjeta a un certificado' : 'Vincular otro certificado a esta tarjeta';

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="text-xs font-semibold text-steel hover:underline bg-transparent border-none self-center"
      >
        + {titulo}
      </button>
    );
  }

  return (
    <div className="rounded-sm border border-gray-200 bg-white p-5">
      <p className="text-sm font-semibold text-gray-700 mb-3">{titulo}</p>

      {revisandoSesion ? (
        <p className="text-xs text-gray-400">Comprobando tu sesión…</p>
      ) : !autenticado ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs text-gray-500">Necesitas iniciar sesión con tu cuenta institucional para vincular tarjetas.</p>
          <button
            onClick={irALogin}
            className="px-4 py-2 text-xs font-semibold text-white rounded-sm border-none"
            style={{ backgroundColor: '#1F4E5F' }}
          >
            Iniciar sesión para vincular
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-400">
            Tarjeta <span className="font-mono text-gray-600">{uid}</span> · elige uno de tus certificados
          </p>
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por código, titular o carrera…"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none"
          />

          {certificados === null ? (
            <p className="text-xs text-gray-400">Cargando tus certificados…</p>
          ) : filtrados.length === 0 ? (
            <p className="text-xs text-gray-400">No se encontraron certificados.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtrados.map((c) => (
                <div key={c.id} className="flex items-center justify-between border border-gray-100 rounded-sm px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{c.nombreEstudiante}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">{c.codigo} · {c.carrera}</p>
                  </div>
                  <button
                    onClick={() => vincular(c)}
                    disabled={vinculandoId === c.id}
                    className="px-3 py-1.5 text-xs font-semibold text-white rounded-sm border-none shrink-0 ml-2 disabled:opacity-50"
                    style={{ backgroundColor: '#1F4E5F' }}
                  >
                    {vinculandoId === c.id ? 'Vinculando…' : 'Vincular'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={irACrearCertificado}
            className="text-xs text-steel hover:underline bg-transparent border-none self-start mt-1"
          >
            ¿No existe todavía? Crear un certificado nuevo y vincularlo
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      {ok && <p className="text-xs text-green-700 mt-3">{ok}</p>}
    </div>
  );
}
