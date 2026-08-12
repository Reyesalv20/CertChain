'use client';

// Ruta pública: "/login"
// Está en (publico) porque, antes de autenticarse, el usuario aún no tiene sesión.
// Al loguearse correctamente, el backend responde con Set-Cookie: certchain_token
// (httpOnly) — ver lib/api.ts (credentials: 'include') y middleware.ts.

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldIcon } from '@/components/icons';
import { CertSeal } from '@/components/CertSeal';
import { createClient } from '@/lib/supabase/client';
//import { api, ApiError } from '@/lib/api';

// useSearchParams necesita un límite <Suspense> para no des-optimizar
// el resto de la página durante el build estático de Next.js.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor ingresa tus credenciales.');
      return;
    }
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const redirectTo = searchParams.get('redirect') || '/dashboard';
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* Panel izquierdo */}
      <div className="hidden lg:flex flex-col items-center justify-center shrink-0 relative overflow-hidden bg-navy" style={{ width: '55%' }}>
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07 }}
          viewBox="0 0 480 800"
          preserveAspectRatio="xMidYMid slice"
        >
          {[40, 80, 120, 160, 200, 240, 280, 320].map((r) => (
            <circle key={`tl-${r}`} cx="0" cy="0" r={r} fill="none" stroke="white" strokeWidth="1" />
          ))}
          {[40, 80, 120, 160, 200, 240, 280, 320].map((r) => (
            <circle key={`br-${r}`} cx="480" cy="800" r={r} fill="none" stroke="white" strokeWidth="1" />
          ))}
          <line x1="0" y1="400" x2="480" y2="400" stroke="white" strokeWidth="0.5" />
          <line x1="240" y1="0" x2="240" y2="800" stroke="white" strokeWidth="0.5" />
        </svg>

        <div className="relative text-center px-12 mb-10">
          <p className="font-mono text-xs uppercase tracking-widest mb-4 text-steel/80">Sistema de certificación</p>
          <h2 className="font-display text-white leading-tight" style={{ fontSize: '2.4rem' }}>
            Credenciales académicas
            <br />
            <em className="text-white/55">
              sin posibilidad
              <br />
              de falsificación
            </em>
          </h2>
        </div>

        <CertSeal />

        <div className="relative mt-10 px-12 text-center">
          <p className="text-white/35 text-xs leading-relaxed max-w-xs">
            Cada documento queda sellado con hash SHA-256 e inscrito de forma permanente en la cadena de bloques.
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <ShieldIcon size={24} color="#1F4E5F" />
            <span className="font-display text-navy text-xl">CertChain</span>
          </div>

          <h1 className="font-display text-navy text-3xl mb-1">Acceso institucional</h1>
          <p className="text-gray-500 text-sm mb-8">Portal exclusivo para instituciones registradas</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
                Correo institucional
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rector@universidad.edu.mx"
                className="w-full px-4 py-3 text-sm rounded-sm outline-none border border-gray-300 focus:border-steel transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full px-4 py-3 text-sm rounded-sm outline-none border border-gray-300 focus:border-steel transition-colors"
              />
            </div>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white rounded-sm transition-all mt-1 border-none"
              style={{ backgroundColor: loading ? '#4a8fa8' : '#1F4E5F', letterSpacing: '0.04em' }}
            >
              {loading ? 'Autenticando...' : 'Ingresar al portal'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              El acceso a este portal está restringido a instituciones académicas debidamente registradas. Las
              sesiones son auditadas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
