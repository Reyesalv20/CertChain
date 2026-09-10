'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { ShieldIcon } from './icons';

// Navbar del área administrativa: "/admin/*".
//
// Los links de navegación llevan contorno (píldora) para distinguirse
// claramente del título "CertChain" — antes ambos eran texto plano y se
// confundían entre sí.
const pillBase = 'px-3.5 py-1.5 text-sm font-medium rounded-full border transition-colors no-underline';
const pillInactivo = 'border-white/25 text-white/70 hover:text-white hover:border-white/50';
const pillActivo = 'border-white/70 text-white bg-white/10';

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

  const pillClass = (path: string) => `${pillBase} ${pathname?.startsWith(path) ? pillActivo : pillInactivo}`;

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
          <div className="hidden md:flex items-center gap-3">
            <Link href="/admin/instituciones" className={pillClass('/admin/instituciones')}>
              Instituciones
            </Link>
            <Link href="/admin/certificados" className={pillClass('/admin/certificados')}>
              Certificados
            </Link>
            <Link href="/admin/credenciales" className={pillClass('/admin/credenciales')}>
              Credenciales
            </Link>
            <Link href="/admin/usuarios" className={pillClass('/admin/usuarios')}>
              Usuarios
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className={`${pillBase} ${pillInactivo}`}>
            Ver sitio público
          </Link>
          <button
            onClick={handleLogout}
            disabled={cerrandoSesion}
            className={`${pillBase} ${pillInactivo} bg-transparent cursor-pointer hover:border-red-300/50`}
          >
            {cerrandoSesion ? 'Saliendo...' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </nav>
  );
}
