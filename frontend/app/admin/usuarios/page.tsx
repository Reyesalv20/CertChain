'use client';

// Admin: gestión de usuarios de la plataforma.
// Roles: admin / institucional (los institucionales se vinculan a una institución).
// Consume el contrato /admin/usuarios (docs/API_CONTRACT.md).

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { InstitucionAdmin, UsuarioAdmin } from '@/lib/types';

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [instituciones, setInstituciones] = useState<InstitucionAdmin[]>([]);
  const [form, setForm] = useState({ email: '', password: '', nombre: '', rol: 'institucional', institucionId: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(() => {
    api
      .obtenerUsuarios()
      .then(setUsuarios)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los usuarios.'));
  }, []);

  useEffect(() => {
    cargar();
    api.obtenerInstituciones().then(setInstituciones).catch(() => setInstituciones([]));
  }, [cargar]);

  async function crear() {
    if (!form.email || !form.password || !form.nombre || busy) return;
    if (form.rol === 'institucional' && !form.institucionId) {
      setError('Elegí la institución para el usuario institucional.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.crearUsuario({
        email: form.email,
        password: form.password,
        nombre: form.nombre,
        rol: form.rol,
        institucionId: form.rol === 'institucional' ? Number(form.institucionId) : null,
      });
      setForm({ email: '', password: '', nombre: '', rol: 'institucional', institucionId: '' });
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

  const institucionNombre = (id: number | null) => instituciones.find((i) => i.institucion_id === id)?.nombre ?? '—';

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-8 font-mono uppercase tracking-widest">
        <span>Administración</span>
        <span>/</span>
        <span className="text-steel">Usuarios</span>
      </div>
      <h1 className="font-display text-navy text-3xl mb-6">Usuarios de la plataforma</h1>

      {error && <p className="text-xs text-red-600 mb-4">{error}</p>}

      {/* Crear */}
      <div className="bg-white border border-gray-200 rounded-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Crear usuario</h2>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre completo" className="px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none" />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" className="px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none" />
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Contraseña inicial" type="password" className="px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none" />
            <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} className="px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none bg-white">
              <option value="institucional">Institucional</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {form.rol === 'institucional' && (
            <select value={form.institucionId} onChange={(e) => setForm({ ...form, institucionId: e.target.value })} className="px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none bg-white">
              <option value="">Seleccioná la institución...</option>
              {instituciones.map((i) => (
                <option key={i.institucion_id} value={i.institucion_id}>
                  {i.nombre}
                </option>
              ))}
            </select>
          )}
          <button onClick={crear} disabled={busy || !form.email || !form.password || !form.nombre} className="self-start px-4 py-2 text-sm font-semibold text-white rounded-sm border-none disabled:opacity-50" style={{ backgroundColor: '#1F4E5F' }}>
            {busy ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>
      </div>

      {/* Lista */}
      {usuarios.length === 0 ? (
        <p className="text-sm text-gray-400">Sin usuarios.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {usuarios.map((u) => (
            <div key={u.usuario_id} className="flex items-center justify-between bg-white border border-gray-200 rounded-sm px-5 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{u.nombre}</p>
                <p className="text-xs text-gray-400">
                  {u.email} · <span className="font-mono">{u.rol}</span>
                  {u.institucion_id ? ` · ${institucionNombre(u.institucion_id)}` : ''}
                </p>
              </div>
              <button onClick={() => eliminar(u.usuario_id)} className="text-xs text-red-600 hover:text-red-700 bg-transparent border-none cursor-pointer">
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
