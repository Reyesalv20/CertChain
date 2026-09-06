'use client';

// Admin: detalle de institución.
// Tres secciones:
//   1. Certificados: click en la fila (o "Editar") abre el formulario para
//      editar la metadata off-chain; "Verificar" enlaza a la página pública.
//   2. Usuarios: solo listado (la gestión está en /admin/usuarios).
//   3. Wallets: lista con "Quitar" y botón "Agregar wallet" que va a la página
//      de alta con panel de firma (addIssuer on-chain + alta en la DB).

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
          <h1 className="font-display text-navy text-3xl mb-2">{inst.nombre}</h1>
          {typeof inst.cantCertificados === 'number' && (
            <p className="text-sm text-gray-400 mb-6">{inst.cantCertificados} certificados emitidos</p>
          )}
          <div className="flex flex-col gap-6">
            <SeccionCertificados institucionId={id} />
            <SeccionUsuarios institucionId={id} />
            <SeccionWallets institucionId={id} />
          </div>
        </>
      )}
    </div>
  );
}

// ── 1. Certificados: editar metadata o verificar ─────────────
function SeccionCertificados({ institucionId }: { institucionId: number }) {
  const [certs, setCerts] = useState<Certificado[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editando, setEditando] = useState<Certificado | null>(null);
  const [form, setForm] = useState({ nombreEstudiante: '', carrera: '', fechaEmision: '' });
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(() => {
    api
      .obtenerCertificadosAdmin(institucionId)
      .then(setCerts)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los certificados.'));
  }, [institucionId]);

  useEffect(cargar, [cargar]);

  function abrirEdicion(c: Certificado) {
    setForm({
      nombreEstudiante: c.nombreEstudiante ?? '',
      carrera: c.carrera ?? '',
      fechaEmision: (c.fechaEmision ?? '').slice(0, 10),
    });
    setEditando(c);
    setAviso('');
    setError('');
  }

  async function guardar() {
    if (!editando || busy) return;
    setBusy(true);
    setError('');
    try {
      const actualizado = await api.actualizarCertificadoAdmin(editando.id, form);
      setCerts((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)));
      setAviso('Metadata actualizada.');
      setEditando(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo actualizar el certificado.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Certificados</h2>
        <span className="text-xs text-gray-400">{certs.length} total</span>
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {aviso && <p className="text-xs text-green-600 mb-2">{aviso}</p>}
      {certs.length === 0 ? (
        <p className="text-xs text-gray-400">Sin certificados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {certs.map((c) => (
            <div
              key={c.id}
              onClick={() => abrirEdicion(c)}
              className="flex items-center justify-between gap-4 border border-gray-100 rounded-sm px-4 py-3 cursor-pointer hover:border-steel hover:bg-[#f4fafb] transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{c.nombreEstudiante}</p>
                <p className="text-xs text-gray-400 font-mono truncate">
                  {c.codigo} · {c.estado}
                  {c.carrera ? ` · ${c.carrera}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => abrirEdicion(c)}
                  className="text-xs font-semibold text-steel hover:text-navy bg-transparent border-none cursor-pointer"
                >
                  Editar
                </button>
                <Link href={`/verificar?codigo=${c.codigo}`} className="text-xs font-semibold text-steel hover:text-navy">
                  Verificar →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: editar metadata */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Editar metadata</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{editando.codigo}</p>
              </div>
              <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg leading-none">
                ×
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Estudiante</label>
                <input value={form.nombreEstudiante} onChange={(e) => setForm({ ...form, nombreEstudiante: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Carrera</label>
                <input value={form.carrera} onChange={(e) => setForm({ ...form, carrera: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Fecha de titulación</label>
                <input value={form.fechaEmision} onChange={(e) => setForm({ ...form, fechaEmision: e.target.value })} type="date" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none" />
              </div>
              <p className="text-[11px] text-gray-400">Solo cambia la metadata en la base; el hash del documento y su registro on-chain no se modifican.</p>
              <div className="flex justify-end gap-3 mt-2">
                <button onClick={() => setEditando(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-transparent border border-gray-300 rounded-sm cursor-pointer">
                  Cancelar
                </button>
                <button onClick={guardar} disabled={busy} className="px-4 py-2 text-sm font-semibold text-white rounded-sm border-none disabled:opacity-50" style={{ backgroundColor: '#1F4E5F' }}>
                  {busy ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── 2. Usuarios: solo listado ────────────────────────────────
function SeccionUsuarios({ institucionId }: { institucionId: number }) {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    api
      .obtenerUsuariosInstitucion(institucionId)
      .then(setUsuarios)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los usuarios.'));
  }, [institucionId]);

  useEffect(cargar, [cargar]);

  return (
    <section className="bg-white border border-gray-200 rounded-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Usuarios institucionales</h2>
        <Link href="/admin/usuarios" className="text-xs text-steel hover:text-navy">
          Gestionar →
        </Link>
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {usuarios.length === 0 ? (
        <p className="text-xs text-gray-400">Sin usuarios.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {usuarios.map((u) => (
            <div key={u.usuario_id} className="flex items-center justify-between border border-gray-100 rounded-sm px-3 py-2">
              <div>
                <p className="text-sm text-gray-800">{u.nombre}</p>
                <p className="text-xs text-gray-400">{u.email} · <span className="font-mono">{u.rol}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── 3. Wallets: quitar / agregar (otra página con firma) ─────
function SeccionWallets({ institucionId }: { institucionId: number }) {
  const [wallets, setWallets] = useState<WalletInstitucion[]>([]);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    api
      .obtenerWalletsInstitucion(institucionId)
      .then(setWallets)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las wallets.'));
  }, [institucionId]);

  useEffect(cargar, [cargar]);

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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Wallets de emisión</h2>
        <Link
          href={`/admin/instituciones/${institucionId}/wallets/nueva`}
          className="px-3 py-1.5 text-xs font-semibold text-white rounded-sm border-none no-underline"
          style={{ backgroundColor: '#1F4E5F' }}
        >
          + Agregar wallet
        </Link>
      </div>
      <p className="text-[11px] text-gray-400 mb-3">Cada wallet de emisión se registra firmando on-chain (addIssuer) en la página de alta.</p>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {wallets.length === 0 ? (
        <p className="text-xs text-gray-400">Sin wallets.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {wallets.map((w) => (
            <div key={w.wallet_id} className="flex items-center justify-between border border-gray-100 rounded-sm px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-mono text-gray-700 truncate">{w.address}</p>
                {w.etiqueta && <p className="text-xs text-gray-400">{w.etiqueta}</p>}
              </div>
              <button onClick={() => quitar(w.wallet_id)} className="text-xs text-red-600 hover:text-red-700 bg-transparent border-none cursor-pointer ml-2 shrink-0">
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
