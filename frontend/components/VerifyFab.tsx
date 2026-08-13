'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldIcon } from './icons';

// Botón flotante de "Verificación pública": se saca de la navbar (donde pasaba
// desapercibido como link de texto) y se pone fijo en pantalla para que sea
// el CTA más visible del portal público, sin dejar de verse profesional.
// No se muestra en /verificar porque ya estarías en esa página.
export function VerifyFab() {
  const pathname = usePathname();
  if (pathname === '/verificar') return null;

  return (
    <Link
      href="/verificar"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-full bg-steel text-white text-sm font-semibold shadow-lg shadow-steel/30 hover:bg-steel-light transition-colors"
    >
      <ShieldIcon size={18} color="#fff" />
      Verificación pública
    </Link>
  );
}
