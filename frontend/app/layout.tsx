import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'CertChain',
  description: 'Plataforma de certificación académica anti-falsificación',
};

// Layout raíz: envuelve TODAS las rutas, tanto (publico) como (institucional).
// Los route groups (publico) e (institucional) no agregan segmento a la URL,
// solo permiten tener layouts y middleware distintos por sección.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
