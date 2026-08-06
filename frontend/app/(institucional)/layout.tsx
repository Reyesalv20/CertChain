import type { ReactNode } from 'react';

// Layout del portal institucional. La protección real ocurre en middleware.ts
// (se ejecuta ANTES de renderizar cualquier página de este grupo), este layout
// solo define el "chrome" visual de la sección autenticada.
export default function InstitucionalLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <nav>CertChain — Portal Institucional</nav>
      <main>{children}</main>
    </div>
  );
}
