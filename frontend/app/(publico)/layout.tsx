import type { ReactNode } from 'react';
import { PublicNavbar } from '@/components/PublicNavbar';
import { VerifyFab } from '@/components/VerifyFab';

// Layout del portal público. No aplica ninguna verificación de sesión:
// cualquier visitante (sin cuenta institucional) puede ver estas rutas.
export default function PublicoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafb]">
      <PublicNavbar />
      {children}
      <VerifyFab />
    </div>
  );
}
