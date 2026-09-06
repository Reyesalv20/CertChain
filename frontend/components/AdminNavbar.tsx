'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { ShieldIcon } from './icons';

// Navbar del área administrativa: "/admin/*".
export function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  async function handleLogout() {
    setCerrandoSesion(true);
    try {
      await api.logout();
    } catch {
      // igual mandamos a login
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
    <nav className="sticky top-0 z-50 bg-[#102A33] border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-8">
          <Link href="/admin/instituciones" className="flex items-center gap-3">
            <ShieldIcon size={28} color="#2E86AB" />
            <span className="font-display text-white text-lg tracking-wide">CertChain</span>
            <span className="text-xs text-white/40 font-mono uppercase tracking-widest ml-1 hidden sm:block">
              Administración
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/admin/instituciones" className={linkClass('/admin/instituciones')}>
              Instituciones
            </Link>
            <Link href="/admin/certificados" className={linkClass('/admin/certificados')}>
              Certificados
            </Link>
            <Link href="/admin/credenciales" className={linkClass('/admin/credenciales')}>
              Credenciales
            </Link>
            <Link href="/admin/usuarios" className={linkClass('/admin/usuarios')}>
              Usuarios
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-white/60 hover:text-white text-sm transition-colors">
            Ver sitio público
          </Link>
          <button
            onClick={handleLogout}
            disabled={cerrandoSesion}
            className="text-white/60 hover:text-white text-sm transition-colors bg-transparent border-none cursor-pointer"
          >
            {cerrandoSesion ? 'Saliendo...' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </nav>
  );
}
