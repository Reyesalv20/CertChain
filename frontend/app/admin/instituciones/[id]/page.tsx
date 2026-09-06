'use client';

// Admin: detalle de institución.
// Secciones: wallets, usuarios y certificados (con vincular/desvincular tarjeta RFID).
// Consume el contrato /admin/* (docs/API_CONTRACT.md). Si el backend aún no
// responde, las secciones quedan vacías y muestran el error.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { Certificado, DetalleInstitucion, UsuarioAdmin, WalletInstitucion } from '@/lib/types';

export default function InstitucionDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [inst, setInst] = useState<DetalleInstitucion | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .obtenerInstitucion(id)
      .then(setInst)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo cargar la institución.'));
  }, [id]);

  if (!inst && !error) return <div className="max-w-4xl mx-auto px-6 py-10 text-sm text-gray-400">Cargando...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-8 font-mono uppercase tracking-widest">
        <Link href="/admin/instituciones" className="hover:text-steel">Administración / Instituciones</Link>
        <span>/</span>
        <span className="text-steel">{inst?.nombre ?? `#${id}`}</span>
      </div>

      {error && <p className="text-xs text-red-600 mb-4">{error}</p>}
      {!error && inst && (
        <>
          <h1 className="font-display text-navy text-3xl mb-6">{inst.nombre}</h1>
          <div className="flex flex-col gap-6">
            <SeccionWallets institucionId={id} />
            <SeccionUsuarios institucionId={id} />
            <SeccionCertificados institucionId={id} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Wallets ───────────────────────────────────────────────────
function SeccionWallets({ institucionId }: { institucionId: number }) {
  const [wallets, setWallets] = useState<WalletInstitucion[]>([]);
  const [address, setAddress] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(() => {
    api
      .obtenerWalletsInstitucion(institucionId)
      .then(setWallets)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las wallets.'));
  }, [institucionId]);

  useEffect(cargar, [cargar]);

  async function agregar() {
    if (!address.trim() || busy) return;
    setBusy(true);
    try {
      await api.agregarWalletInstitucion(institucionId, { address: address.trim(), etiqueta: etiqueta.trim() || undefined });
      setAddress('');
      setEtiqueta('');
      cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo agregar la wallet.');
    } finally {
      setBusy(false);
    }
  }

  async function quitar(walletId: number) {
    try {
      await api.eliminarWalletInstitucion(institucionId, walletId);
      cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo eliminar la wallet.');
    }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-sm p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Wallets</h2>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x + 40 hex (wallet)" className="px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none font-mono" />
          <input value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="Etiqueta (ej. Emisión)" className="px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none" />
          <button onClick={agregar} disabled={busy || !address.trim()} className="px-4 py-2 text-sm font-semibold text-white rounded-sm border-none disabled:opacity-50" style={{ backgroundColor: '#1F4E5F' }}>
            {busy ? '...' : 'Agregar'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400">Al agregar una wallet recordá firmar on-chain el registro del emisor (opción futura del panel).</p>
        <div className="flex flex-col gap-2">
          {wallets.length === 0 ? (
            <p className="text-xs text-gray-400">Sin wallets.</p>
          ) : (
            wallets.map((w) => (
              <div key={w.wallet_id} className="flex items-center justify-between border border-gray-100 rounded-sm px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-mono text-gray-700 truncate">{w.address}</p>
                  {w.etiqueta && <p className="text-xs text-gray-400">{w.etiqueta}</p>}
                </div>
                <button onClick={() => quitar(w.wallet_id)} className="text-xs text-red-600 hover:text-red-700 bg-transparent border-none cursor-pointer ml-2 shrink-0">
                  Quitar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

// ── Usuarios ──────────────────────────────────────────────────
function SeccionUsuarios({ institucionId }: { institucionId: number }) {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [form, setForm] = useState({ email: '', password: '', nombre: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(() => {
    api
      .obtenerUsuariosInstitucion(institucionId)
      .then(setUsuarios)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los usuarios.'));
  }, [institucionId]);

  useEffect(cargar, [cargar]);

  async function crear() {
    if (!form.email || !form.password || !form.nombre || busy) return;
    setBusy(true);
    try {
      await api.crearUsuario({
        email: form.email,
        password: form.password,
        nombre: form.nombre,
        rol: 'institucional',
        institucionId,
      });
      setForm({ email: '', password: '', nombre: '' });
      cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo crear el usuario.');
    } finally {
      setBusy(false);
    }
  }

  async function eliminar(usuarioId: string) {
    try {
      await api.eliminarUsuario(usuarioId);
      cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo eliminar el usuario.');
    }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-sm p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Usuarios institucionales</h2>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex flex-col gap-3 mb-4">
        <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre completo" className="px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none" />
        <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" className="px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none" />
        <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Contraseña inicial" type="password" className="px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none" />
        <button onClick={crear} disabled={busy || !form.email || !form.password || !form.nombre} className="self-start px-4 py-2 text-sm font-semibold text-white rounded-sm border-none disabled:opacity-50" style={{ backgroundColor: '#1F4E5F' }}>
          {busy ? 'Creando...' : 'Crear usuario'}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {usuarios.length === 0 ? (
          <p className="text-xs text-gray-400">Sin usuarios.</p>
        ) : (
          usuarios.map((u) => (
            <div key={u.usuario_id} className="flex items-center justify-between border border-gray-100 rounded-sm px-3 py-2">
              <div>
                <p className="text-sm text-gray-800">{u.nombre}</p>
                <p className="text-xs text-gray-400">{u.email} · <span className="font-mono">{u.rol}</span></p>
              </div>
              <button onClick={() => eliminar(u.usuario_id)} className="text-xs text-red-600 hover:text-red-700 bg-transparent border-none cursor-pointer shrink-0">
                Eliminar
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// ── Certificados (con vincular tarjeta) ──────────────────────
function SeccionCertificados({ institucionId }: { institucionId: number }) {
  const [certs, setCerts] = useState<Certificado[]>([]);
  const [uidPorCert, setUidPorCert] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    api
      .obtenerCertificadosAdmin(institucionId)
      .then(setCerts)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los certificados.'));
  }, [institucionId]);

  useEffect(cargar, [cargar]);

  async function vincular(certId: string) {
    const uid = uidPorCert[certId]?.trim();
    if (!uid) return;
    try {
      await api.vincularCredencial(certId, uid);
      setUidPorCert((prev) => ({ ...prev, [certId]: '' }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo vincular la tarjeta.');
    }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-sm p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Certificados</h2>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {certs.length === 0 ? (
        <p className="text-xs text-gray-400">Sin certificados.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {certs.map((c) => (
            <div key={c.id} className="border border-gray-100 rounded-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.nombreEstudiante}</p>
                  <p className="text-xs text-gray-400 font-mono">{c.codigo} · {c.estado}</p>
                </div>
                <Link href={`/verificar?codigo=${c.codigo}`} className="text-xs text-steel hover:underline">
                  Ver
                </Link>
              </div>
              <div className="flex gap-2">
                <input
                  value={uidPorCert[c.id] ?? ''}
                  onChange={(e) => setUidPorCert((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && vincular(c.id)}
                  placeholder="UID de tarjeta RFID para vincular"
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-sm outline-none font-mono"
                />
                <button onClick={() => vincular(c.id)} className="px-3 py-1.5 text-xs font-semibold text-white rounded-sm border-none" style={{ backgroundColor: '#1F4E5F' }}>
                  Vincular
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
