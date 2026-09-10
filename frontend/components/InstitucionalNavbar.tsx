'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ShieldIcon } from './icons';

// Navbar del portal institucional (grupo (institucional)): "/dashboard", "/certificados".
//
// Los links de navegación llevan contorno (píldora) para distinguirse
// claramente del título "CertChain" — antes ambos eran texto plano y se
// confundían entre sí.
const pillBase = 'px-3.5 py-1.5 text-sm font-medium rounded-full border transition-colors no-underline';
const pillInactivo = 'border-white/25 text-white/70 hover:text-white hover:border-white/50';
const pillActivo = 'border-white/70 text-white bg-white/10';

export function InstitucionalNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  async function handleLogout() {
    setCerrandoSesion(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Igual mandamos a login; si signOut falla el middleware seguirá
      // protegiendo, pero preferimos no dejar al usuario atascado acá.
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  const pillClass = (path: string) => `${pillBase} ${pathname?.startsWith(path) ? pillActivo : pillInactivo}`;

  return (
    <nav className="sticky top-0 z-50 bg-navy border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <ShieldIcon size={28} color="#2E86AB" />
            <span className="font-display text-white text-lg tracking-wide">CertChain</span>
            <span className="text-xs text-white/40 font-mono uppercase tracking-widest ml-1 hidden sm:block">
              Portal institucional
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/dashboard" className={pillClass('/dashboard')}>
              Panel
            </Link>
            <Link href="/certificados" className={pillClass('/certificados')}>
              Certificados
            </Link>
            <Link href="/verificar" className={pillClass('/verificar')}>
              Escanear tarjeta
            </Link>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={cerrandoSesion}
          className={`${pillBase} ${pillInactivo} bg-transparent cursor-pointer hover:border-red-300/50`}
        >
          {cerrandoSesion ? 'Saliendo...' : 'Cerrar sesión'}
        </button>
      </div>
    </nav>
  );
}
