import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Áreas protegidas y su rol requerido.
// '/dashboard' y '/certificados' son del portal institucional; '/admin' solo admin.
const AREAS: Array<{ prefix: string; rol: string; home: string }> = [
  { prefix: '/admin', rol: 'admin', home: '/admin/instituciones' },
  { prefix: '/dashboard', rol: 'institucional', home: '/dashboard' },
  { prefix: '/certificados', rol: 'institucional', home: '/dashboard' },
];

// El rol viaja en user.app_metadata (lo setea el backend al crear/editar
// usuarios). El middleware NO consulta la tabla usuarios a cada request.
function rolDeUsuario(user: { app_metadata?: Record<string, unknown> } | null): string | null {
  const rol = user?.app_metadata?.rol;
  return rol === 'admin' || rol === 'institucional' ? rol : null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const area = AREAS.find((a) => pathname.startsWith(a.prefix));

  if (!area) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() valida el token contra Supabase (no solo lee la cookie).
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const rol = rolDeUsuario(user);
  if (rol !== area.rol) {
    if (rol) {
      // Autenticado pero con el área equivocada: va a su home según su rol.
      const home = AREAS.find((a) => a.rol === rol)!.home;
      return NextResponse.redirect(new URL(home, request.url));
    }
    // Autenticado sin rol conocido: se lo manda al home público.
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  // Se excluye '/verificar' de la protección por rol (es público); solo se
  // protegen las áreas autenticadas.
  matcher: ['/dashboard', '/dashboard/:path*', '/certificados', '/certificados/:path*', '/admin', '/admin/:path*'],
};
