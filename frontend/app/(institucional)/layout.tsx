import type { ReactNode } from 'react';
import { InstitucionalNavbar } from '@/components/InstitucionalNavbar';

// Layout del portal institucional. La protección real ocurre en middleware.ts
// (se ejecuta ANTES de renderizar cualquier página de este grupo), este layout
// solo define el "chrome" visual de la sección autenticada.
export default function InstitucionalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafb]">
      <InstitucionalNavbar />
      {children}
    </div>
  );
}
