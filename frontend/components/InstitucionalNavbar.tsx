'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { ShieldIcon } from './icons';

// Navbar del portal institucional (grupo (institucional)): "/dashboard", "/certificados".
export function InstitucionalNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  async function handleLogout() {
    setCerrandoSesion(true);
    try {
      await api.logout();
    } catch {
      // Si el backend no responde igual mandamos al usuario a login;
      // sin la cookie httpOnly el middleware lo detendrá de todos modos.
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  const linkClass = (path: string) =>
    `text-sm font-medium transition-colors ${
      pathname?.startsWith(path) ? 'text-white' : 'text-white/60 hover:text-white'
    }`;

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
          <div className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className={linkClass('/dashboard')}>
              Panel
            </Link>
            <Link href="/certificados" className={linkClass('/certificados')}>
              Certificados
            </Link>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={cerrandoSesion}
          className="text-white/60 hover:text-white text-sm transition-colors bg-transparent border-none cursor-pointer"
        >
          {cerrandoSesion ? 'Saliendo...' : 'Cerrar sesión'}
        </button>
      </div>
    </nav>
  );
}
