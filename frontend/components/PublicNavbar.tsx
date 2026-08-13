import Link from 'next/link';
import { ShieldIcon } from './icons';

// Navbar del portal público (grupo (publico)): "/", "/verificar", "/login".
// El CTA de "Verificación pública" ya no vive aquí: es el botón flotante
// (ver VerifyFab.tsx) para que resalte más. Aquí solo queda el logo,
// anclado a la izquierda, y el acceso institucional como link discreto.
export function PublicNavbar() {
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
        <Link href="/login" className="text-white/50 hover:text-white text-sm transition-colors">
          Acceso institucional
        </Link>
      </div>
    </nav>
  );
}
