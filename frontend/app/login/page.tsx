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

        <form onSubmit={submit} className="card mt-8 flex flex-col gap-4">
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
