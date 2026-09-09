'use client';

// Navbar del portal público (grupo (publico)): "/", "/verificar", "/login".
// El CTA de "Verificación pública" ya no vive aquí: es el botón flotante
// (ver VerifyFab.tsx) para que resalte más. Aquí solo queda el logo,
// anclado a la izquierda, y el acceso institucional.
//
// Es consciente de la sesión: si alguien ya logueado (institucional o admin)
// entra a una página pública (p. ej. desde "Escanear tarjeta"), no debe verse
// como si hubiera cerrado sesión — se le muestra "Volver al portal" en vez de
// "Acceso institucional".

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldIcon } from './icons';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';

// Mismo estilo de "botón con contorno" que Institucional/AdminNavbar, para
// que las acciones del header se distingan claramente del título "CertChain".
const pillBase =
  'px-3.5 py-1.5 text-sm font-medium rounded-full border transition-colors no-underline';
const pillInactivo = 'border-white/25 text-white/70 hover:text-white hover:border-white/50';

export function PublicNavbar() {
  const router = useRouter();
  const [estado, setEstado] = useState<'cargando' | 'anonimo' | 'institucional' | 'admin'>('cargando');
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const supabase = createClient();

    async function revisar() {
      const { data } = await supabase.auth.getSession();
      if (cancelado) return;
      if (!data.session) {
        setEstado('anonimo');
        return;
      }
      try {
        const me = await api.obtenerMe();
        if (cancelado) return;
        setEstado(me.usuario?.rol === 'admin' ? 'admin' : 'institucional');
      } catch {
        if (!cancelado) setEstado('anonimo');
      }
    }
    revisar();

    // Si cierra/inicia sesión en otra pestaña, este header se actualiza solo.
    const { data: sub } = supabase.auth.onAuthStateChange(() => revisar());
    return () => {
      cancelado = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setCerrandoSesion(true);
    try {
      await api.logout();
    } catch {
      // igual mandamos a login
    } finally {
      setEstado('anonimo');
      setCerrandoSesion(false);
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-navy border-b border-white/10">
      <div className="w-full px-6 sm:px-10 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-3">
          <ShieldIcon size={28} color="#2E86AB" />
          <span className="font-display text-white text-lg tracking-wide">CertChain</span>
          <span className="text-xs text-white/40 font-mono uppercase tracking-widest ml-1 hidden sm:block">
            Registro académico
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {estado === 'institucional' && (
            <>
              <Link href="/dashboard" className={`${pillBase} ${pillInactivo}`}>
                Volver al portal
              </Link>
              <button
                onClick={handleLogout}
                disabled={cerrandoSesion}
                className={`${pillBase} ${pillInactivo} bg-transparent cursor-pointer hover:border-red-300/50`}
              >
                {cerrandoSesion ? 'Saliendo…' : 'Cerrar sesión'}
              </button>
            </>
          )}
          {estado === 'admin' && (
            <>
              <Link href="/admin/instituciones" className={`${pillBase} ${pillInactivo}`}>
                Volver al panel
              </Link>
              <button
                onClick={handleLogout}
                disabled={cerrandoSesion}
                className={`${pillBase} ${pillInactivo} bg-transparent cursor-pointer hover:border-red-300/50`}
              >
                {cerrandoSesion ? 'Saliendo…' : 'Cerrar sesión'}
              </button>
            </>
          )}
          {(estado === 'anonimo' || estado === 'cargando') && (
            <Link href="/login" className={`${pillBase} ${pillInactivo}`} style={{ opacity: estado === 'cargando' ? 0 : 1 }}>
              Acceso institucional
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
