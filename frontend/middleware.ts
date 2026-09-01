import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const INSTITUCIONAL_PATHS = ['/dashboard', '/certificados'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const esInstitucional = INSTITUCIONAL_PATHS.some((path) => pathname.startsWith(path));

  if (!esInstitucional) {
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

  // IMPORTANTE: usa getUser(), no getSession(), porque getUser()
  // valida el token contra el servidor de Supabase (getSession() solo lee la cookie local).
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  //matcher: ['/dashboard/:path*', '/certificados/:path*'],
  //No sé exactamente por qué, pero si pongo /dashboard/:path* no funciona, 
  // y si pongo /dashboard sin :path* sí funciona. 
  // Tal vez sea un bug de Next.js 14.0.0-canary.12.
  matcher: ['/verificar/:path*', '/certificados/:path*'],
};