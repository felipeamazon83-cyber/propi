'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07182f] px-5 py-12 text-white">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b2344] p-8 shadow-2xl">
        
        {/* Encabezado */}
        <div className="mb-6 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
            Guía de inicio rápido · {step} / 3
          </span>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            {step === 1 && 'Así funciona tu perfil en Propi'}
            {step === 2 && 'Gestión de propinas para tu equipo'}
            {step === 3 && 'Cobros directos con Stripe Connect'}
          </h1>
        </div>

        {/* Indicador de pasos */}
        <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
          <button onClick={() => setStep(1)} className={step === 1 ? 'text-orange-400 font-bold' : ''}>
            1. Negocio & QR
          </button>
          <span>→</span>
          <button onClick={() => setStep(2)} className={step === 2 ? 'text-orange-400 font-bold' : ''}>
            2. Reparto
          </button>
          <span>→</span>
          <button onClick={() => setStep(3)} className={step === 3 ? 'text-orange-400 font-bold' : ''}>
            3. Stripe
          </button>
        </div>

        {/* PASO 1 */}
        {step === 1 && (
          <div className="flex flex-col gap-5 text-slate-300">
            <p className="text-sm text-slate-400">
              Tus clientes escanearán el código QR único de tu local para dejar propinas instantáneas pagando con Google Pay, Apple Pay o tarjeta.
            </p>
            
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
              <div className="mx-auto mb-3 flex h-28 w-28 items-center justify-center rounded-xl bg-white/10 text-5xl shadow-inner">
                📱
              </div>
              <p className="text-xs font-mono text-slate-400">propi-kohl.vercel.app/qr/tu-local</p>
            </div>

            <button 
              onClick={() => setStep(2)} 
              className="mt-2 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600 transition-all"
            >
              Siguiente paso →
            </button>
          </div>
        )}

        {/* PASO 2 */}
        {step === 2 && (
          <div className="flex flex-col gap-5 text-slate-300">
            <p className="text-sm text-slate-400">
              Las propinas recibidas se acumulan y distribuyen de forma automática entre tu personal activo según tus reglas.
            </p>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                <span className="font-medium">👤 Carlos (Camarero)</span>
                <span className="text-emerald-400 font-bold">+€15.50</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                <span className="font-medium">👤 Ana (Cocina)</span>
                <span className="text-emerald-400 font-bold">+€15.50</span>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => setStep(1)} 
                className="w-1/3 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white hover:bg-white/5 transition-all"
              >
                ← Atrás
              </button>
              <button 
                onClick={() => setStep(3)} 
                className="w-2/3 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-all"
              >
                Siguiente paso →
              </button>
            </div>
          </div>
        )}

        {/* PASO 3 */}
        {step === 3 && (
          <div className="flex flex-col gap-5 text-center text-slate-300">
            <p className="text-sm text-slate-400">
              Stripe Connect procesa los pagos con total seguridad y transfiere los fondos periódicamente a la cuenta de tu negocio o empleados.
            </p>

            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-6 text-indigo-300 text-sm font-medium">
              🔒 Procesamiento seguro mediante Stripe Connect. Configura tu cuenta real en Ajustes.
            </div>

            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => setStep(2)} 
                className="w-1/3 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white hover:bg-white/5 transition-all"
              >
                ← Atrás
              </button>
              <button 
                onClick={() => router.push('/dashboard')} 
                className="w-2/3 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-all shadow-lg"
              >
                Ir a mi Panel General 🚀
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
