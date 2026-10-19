'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/context/LanguageContext';

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0f17] px-5 py-12 text-white">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#121824] p-8 shadow-2xl">
        
        {/* Encabezado */}
        <div className="mb-6 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
            {t('Onboarding.badge')} · {step} / 3
          </span>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            {step === 1 && t('Onboarding.step1Title')}
            {step === 2 && t('Onboarding.step2Title')}
            {step === 3 && t('Onboarding.step3Title')}
          </h1>
        </div>

        {/* Indicador de pasos */}
        <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
          <button onClick={() => setStep(1)} className={step === 1 ? 'text-orange-400 font-bold' : ''}>
            1. {t('Onboarding.step1Label')}
          </button>
          <span>→</span>
          <button onClick={() => setStep(2)} className={step === 2 ? 'text-orange-400 font-bold' : ''}>
            2. {t('Onboarding.step2Label')}
          </button>
          <span>→</span>
          <button onClick={() => setStep(3)} className={step === 3 ? 'text-orange-400 font-bold' : ''}>
            3. {t('Onboarding.step3Label')}
          </button>
        </div>

        {/* PASO 1: Demostración Negocio & QR */}
        {step === 1 && (
          <div className="flex flex-col gap-5 text-slate-300">
            <p className="text-sm text-slate-400">
              {t('Onboarding.step1Desc')}
            </p>
            
            {/* Simulación visual de QR */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
              <div className="mx-auto mb-3 flex h-28 w-28 items-center justify-center rounded-xl bg-white/10 text-5xl shadow-inner">
                📱
              </div>
              <p className="text-xs font-mono text-slate-400">propi-kohl.vercel.app/qr/tu-local</p>
            </div>

            <button 
              onClick={() => setStep(2)} 
              className="btn btn-primary mt-2 w-full py-3 font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all"
            >
              {t('Onboarding.next')} →
            </button>
          </div>
        )}

        {/* PASO 2: Demostración Equipo */}
        {step === 2 && (
          <div className="flex flex-col gap-5 text-slate-300">
            <p className="text-sm text-slate-400">
              {t('Onboarding.step2Desc')}
            </p>

            {/* Simulación de miembros del equipo */}
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
                ← {t('Onboarding.back')}
              </button>
              <button 
                onClick={() => setStep(3)} 
                className="w-2/3 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-all"
              >
                {t('Onboarding.next')} →
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: Demostración Stripe Connect */}
        {step === 3 && (
          <div className="flex flex-col gap-5 text-center text-slate-300">
            <p className="text-sm text-slate-400">
              {t('Onboarding.step3Desc')}
            </p>

            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-6 text-indigo-300 text-sm font-medium">
              🔒 {t('Onboarding.stripeNotice')}
            </div>

            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => setStep(2)} 
                className="w-1/3 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white hover:bg-white/5 transition-all"
              >
                ← {t('Onboarding.back')}
              </button>
              <button 
                onClick={() => router.push('/dashboard')} 
                className="w-2/3 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-all shadow-lg"
              >
                {t('Onboarding.finish')} 🚀
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
