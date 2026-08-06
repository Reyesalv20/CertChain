import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas reales (sin los paréntesis de route group) que pertenecen al portal institucional.
// Si agregas una página nueva dentro de app/(institucional)/..., agrega su path aquí también.
const INSTITUCIONAL_PATHS = ['/dashboard', '/certificados'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const esInstitucional = INSTITUCIONAL_PATHS.some((path) => pathname.startsWith(path));

  if (!esInstitucional) {
    return NextResponse.next();
  }

  // TODO: reemplazar por validación real (JWT firmado por el backend, expiración, roles, etc.)
  const token = request.cookies.get('certchain_token');

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// El matcher evita que el middleware se ejecute en TODAS las rutas (assets, /verificar, etc.),
// solo corre en las rutas institucionales -> mejor performance.
export const config = {
  matcher: ['/dashboard/:path*', '/certificados/:path*'],
};
