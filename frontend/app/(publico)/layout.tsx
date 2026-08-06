import type { ReactNode } from 'react';

// Layout del portal público. No aplica ninguna verificación de sesión:
// cualquier visitante (sin cuenta institucional) puede ver estas rutas.
export default function PublicoLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <nav>CertChain — Portal Público</nav>
      <main>{children}</main>
    </div>
  );
}
