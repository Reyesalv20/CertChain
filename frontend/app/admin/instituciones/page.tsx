'use client';

// Admin: lista de instituciones + crear. Consume /admin/instituciones.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { InstitucionAdmin } from '@/lib/types';

export default function AdminInstitucionesPage() {
  const [items, setItems] = useState<InstitucionAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState('');
  const [creando, setCreando] = useState(false);

  async function cargar() {
    setCargando(true);
    try {
      setItems(await api.obtenerInstituciones());
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las instituciones.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crear() {
    if (!nombre.trim() || creando) return;
    setCreando(true);
    try {
      await api.crearInstitucion(nombre.trim());
      setNombre('');
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la institución.');
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-8 font-mono uppercase tracking-widest">
        <span>Administración</span>
        <span>/</span>
        <span className="text-steel">Instituciones</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-navy text-3xl">Instituciones</h1>
      </div>

      {error && <p className="text-xs text-red-600 mb-4">{error}</p>}

      {/* Crear */}
      <div className="bg-white border border-gray-200 rounded-sm p-5 mb-6 flex gap-3">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && crear()}
          placeholder="Nombre de la nueva institución"
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-sm outline-none focus:border-steel"
        />
        <button
          onClick={crear}
          disabled={creando || !nombre.trim()}
          className="px-4 py-2.5 text-sm font-semibold text-white rounded-sm border-none disabled:opacity-50"
          style={{ backgroundColor: '#1F4E5F' }}
        >
          {creando ? 'Creando...' : 'Crear'}
        </button>
      </div>

      {cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no hay instituciones.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((i) => (
            <Link
              key={i.institucion_id}
              href={`/admin/instituciones/${i.institucion_id}`}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-sm px-5 py-4 hover:border-steel transition-colors"
            >
              <span className="text-sm font-medium text-gray-800">{i.nombre}</span>
              <span className="text-xs text-gray-400 font-mono">id {i.institucion_id} →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
