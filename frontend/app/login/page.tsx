'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError('No pudimos validar tus datos. Revisa tu email y contraseña.');
    location.href = '/dashboard';
  }

  async function handleGoogleLogin() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://propi-kohl.vercel.app/dashboard',
        },
      });
      if (error) throw error;
    } catch (err) {
      setError('No se pudo iniciar sesión con Google.');
    }
  }

  return (
    <main className="glow relative flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        {/* Botón de volver a la Landing Page */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-orange-300"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Volver a la página principal</span>
          </Link>
        </div>

        <Link href="/" className="auth-brand" aria-label="Propi">
          <img src="/propi-logo-new.png" alt="Propi · Propinas que hacen la diferencia" />
        </Link>

        <div className="mt-10 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-orange-300">
            Bienvenido de nuevo
          </p>
          <h1 className="mt-3 text-4xl font-black">Entra a tu espacio</h1>
          <p className="mt-3 text-slate-400">
            Gestiona tu equipo y tus propinas desde un solo lugar.
          </p>
        </div>

        {/* Botón de Google */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 shadow-md"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.6 3.6 1.7 7.4l3.7 2.9C6.3 7.3 8.9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.4 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.7 6.4C.6 8.6 0 10.2 0 12s.6 3.4 1.7 5.6l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.7-2.3-6.6-5.3L1.7 15C3.6 18.8 7.4 23 12 23z"
              />
            </svg>
            Continuar con Google
          </button>
        </div>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative bg-[#0b0f17] px-3 text-xs uppercase tracking-wider text-slate-500">
            o con tu email
          </div>
        </div>

        <form onSubmit={submit} className="card flex flex-col gap-4">
          <label>
            Email
            <input
              className="field mt-2"
              type="email"
              placeholder="tu@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Contraseña
            <input
              className="field mt-2"
              type="password"
              placeholder="Tu contraseña"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary mt-2 w-full">Entrar a Propi</button>
        </form>

        <p className="mt-6 text-center text-slate-400">
          ¿Aún no tienes cuenta?{' '}
          <Link className="font-bold text-orange-300" href="/register">
            Crear cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}
