'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password });
    setMessage(
      error
        ? 'No pudimos crear la cuenta. Revisa los datos e inténtalo de nuevo.'
        : 'Revisa tu email para confirmar tu cuenta.'
    );
  }

  async function handleGoogleLogin() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setMessage('No se pudo continuar con Google.');
    }
  }

  return (
    <main className="glow flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="auth-brand" aria-label="Propi">
          <img src="/propi-logo-new.png" alt="Propi · Propinas que hacen la diferencia" />
        </Link>
        <div className="mt-10 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-orange-300">Empieza hoy</p>
          <h1 className="mt-3 text-4xl font-black">Crea tu espacio Propi</h1>
          <p className="mt-3 text-slate-400">Lleva la experiencia de tu equipo al siguiente nivel.</p>
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
            Registrarse con Google
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
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {message && <p className="form-message">{message}</p>}
          <button className="btn btn-primary mt-2 w-full">Crear cuenta gratis</button>
        </form>

        <p className="mt-6 text-center text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <Link className="font-bold text-orange-300" href="/login">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
