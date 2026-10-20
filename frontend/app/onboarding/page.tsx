'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../../context/LanguageContext';
import { LanguageSelector } from '../../components/LanguageSelector';

export default function OnboardingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState(1);

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#07182f] px-5 py-12 text-white">
      {/* Selector de idioma flotante */}
      <div className="absolute top-6 right-6">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0b2344] p-8 shadow-2xl">
        
        {/* Encabezado */}
        <div className="mb-6 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
            {t('OnboardingGuide.stepTitle') || 'Guía de Inicio Rápido · Paso'} {step} de 4
          </span>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            {step === 1 && '1. Datos del Negocio y Stripe Connect'}
            {step === 2 && '2. Gestión de Equipo y Enlace IBAN'}
            {step === 3 && '3. Configuración de Mesas, QR y NFC'}
            {step === 4 && '4. Control y Pago de Propinas desde el Dashboard'}
          </h1>
        </div>

        {/* Indicador de pasos */}
        <div className="mb-8 grid grid-cols-2 gap-2 border-b border-white/10 pb-4 text-center text-xs font-bold uppercase tracking-wider text-slate-400 sm:grid-cols-4">
          <button 
            onClick={() => setStep(1)} 
            className={`py-1.5 rounded-lg transition-colors ${step === 1 ? 'bg-orange-400/20 text-orange-300 border border-orange-400/30 font-bold' : 'hover:bg-white/5'}`}
          >
            {t('OnboardingGuide.step1Nav') || '1. Negocio & Stripe'}
          </button>
          <button 
            onClick={() => setStep(2)} 
            className={`py-1.5 rounded-lg transition-colors ${step === 2 ? 'bg-orange-400/20 text-orange-300 border border-orange-400/30 font-bold' : 'hover:bg-white/5'}`}
          >
            {t('OnboardingGuide.step2Nav') || '2. Equipo & IBAN'}
          </button>
          <button 
            onClick={() => setStep(3)} 
            className={`py-1.5 rounded-lg transition-colors ${step === 3 ? 'bg-orange-400/20 text-orange-300 border border-orange-400/30 font-bold' : 'hover:bg-white/5'}`}
          >
            {t('OnboardingGuide.step3Nav') || '3. Mesas & QR'}
          </button>
          <button 
            onClick={() => setStep(4)} 
            className={`py-1.5 rounded-lg transition-colors ${step === 4 ? 'bg-orange-400/20 text-orange-300 border border-orange-400/30 font-bold' : 'hover:bg-white/5'}`}
          >
            {t('OnboardingGuide.step4Nav') || '4. Dashboard'}
          </button>
        </div>

        {/* PASO 1: Datos del negocio & Stripe */}
        {step === 1 && (
          <div className="flex flex-col gap-5 text-slate-300">
            <p className="text-sm leading-relaxed text-slate-300">
              En la sección <strong className="text-white">1. Datos del negocio</strong> de Configuración, registra el Nombre Comercial, Razón Social, País y Moneda. Define quién asumirá los costes de servicio de procesamiento.
            </p>
            
            <div className="space-y-3 rounded-xl border border-white/10 bg-[#07182f]/80 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-sm font-bold text-orange-300">1</span>
                <div>
                  <p className="text-xs font-bold text-white">Configura tu perfil</p>
                  <p className="text-xs text-slate-400">Rellena los datos básicos e sube el logo de tu local (PNG, JPG o WEBP).</p>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t border-white/5 pt-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-sm font-bold text-indigo-300">2</span>
                <div>
                  <p className="text-xs font-bold text-white">Haz clic en &quot;Gestionar Stripe&quot;</p>
                  <p className="text-xs text-slate-400">Vincularás la cuenta bancaria de tu empresa para recibir los fondos de forma automática y segura.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setStep(2)} 
              className="mt-2 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white shadow-lg transition-all hover:bg-orange-600"
            >
              {t('OnboardingGuide.nextStep') || 'Siguiente paso:'} Añadir equipo →
            </button>
          </div>
        )}

        {/* PASO 2: Equipo y enlace IBAN */}
        {step === 2 && (
          <div className="flex flex-col gap-5 text-slate-300">
            <p className="text-sm leading-relaxed text-slate-300">
              En la sección <strong className="text-white">2. Equipo y cuenta de cobro</strong>, crea los perfiles de tus empleados para que puedan recibir sus propinas directamente.
            </p>

            <div className="space-y-4 rounded-xl border border-white/10 bg-[#07182f]/80 p-5">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
                <span className="font-semibold text-white">Eduardo Fernandez · Activo</span>
                <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                  Pendiente IBAN 🔗
                </span>
              </div>
              
              <ul className="list-disc space-y-2 pl-4 text-xs text-slate-400">
                <li>Al escribir el nombre y pulsar <strong className="text-white">&quot;Añadir&quot;</strong>, se genera el registro del trabajador.</li>
                <li>Haz clic sobre la etiqueta <strong className="text-amber-300">&quot;Pendiente IBAN&quot;</strong> para copiar su enlace de invitación personalizado.</li>
                <li>Envia este enlace a tu empleado para que introduzca de forma 100% privada y segura sus datos bancarios a través de Stripe (Propi nunca los almacena).</li>
              </ul>
            </div>

            <div className="mt-2 flex gap-3">
              <button 
                onClick={() => setStep(1)} 
                className="w-1/3 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white transition-all hover:bg-white/5"
              >
                {t('OnboardingGuide.backStep') || '← Atrás'}
              </button>
              <button 
                onClick={() => setStep(3)} 
                className="w-2/3 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-orange-600"
              >
                {t('OnboardingGuide.nextStep') || 'Siguiente paso:'} Crear mesas →
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: Mesa, QR y NFC */}
        {step === 3 && (
          <div className="flex flex-col gap-5 text-slate-300">
            <p className="text-sm leading-relaxed text-slate-300">
              En la sección <strong className="text-white">3. Mesa, QR y NFC</strong>, configura cada punto de cobro (Mesas, Barra o Terraza) e imprime sus identificadores o grábalos en pegatinas NFC.
            </p>

            <div className="space-y-3 rounded-xl border border-white/10 bg-[#07182f]/80 p-5 text-xs">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-slate-300">
                <div className="rounded-lg border border-white/5 bg-white/5 p-2.5">
                  <span className="block font-bold text-white">1. Asignación</span>
                  Elige si el cliente escoge al empleado o si la mesa pertenece a un empleado fijo.
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 p-2.5">
                  <span className="block font-bold text-white">2. Propinas Sugeridas</span>
                  Establece las sugerencias rápidas (ej. 1, 2, 3, 5 €) y el % asignado.
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2 border-t border-white/10 pt-2">
                <span className="rounded-lg bg-white/10 px-3 py-1 text-slate-200">🔍 Probar QR</span>
                <span className="rounded-lg bg-white/10 px-3 py-1 text-slate-200">🔗 Copiar URL NFC</span>
                <span className="rounded-lg bg-orange-500 px-3 py-1 font-bold text-white">🎨 Tarjeta Mesa</span>
              </div>
            </div>

            <div className="mt-2 flex gap-3">
              <button 
                onClick={() => setStep(2)} 
                className="w-1/3 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white transition-all hover:bg-white/5"
              >
                {t('OnboardingGuide.backStep') || '← Atrás'}
              </button>
              <button 
                onClick={() => setStep(4)} 
                className="w-2/3 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-orange-600"
              >
                {t('OnboardingGuide.nextStep') || 'Siguiente paso:'} Dashboard →
              </button>
            </div>
          </div>
        )}

        {/* PASO 4: Dashboard y Pago de Propinas */}
        {step === 4 && (
          <div className="flex flex-col gap-5 text-slate-300">
            <p className="text-sm leading-relaxed text-slate-300">
              Consulta las métricas en tiempo real desde tu <strong className="text-white">Dashboard</strong>. Cuando los clientes paguen propinas, verás el acumulado y la acción disponible para liquidar a cada empleado.
            </p>

            <div className="space-y-4 rounded-xl border border-white/10 bg-[#07182f]/80 p-5">
              {/* Resumen de Métricas */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg border border-white/5 bg-white/5 p-2.5">
                  <span className="block text-[10px] text-slate-400">Propinas acumuladas</span>
                  <span className="text-sm font-bold text-amber-300">3,00 €</span>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 p-2.5">
                  <span className="block text-[10px] text-slate-400">Cantidad de propinas</span>
                  <span className="text-sm font-bold text-white">2</span>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/5 p-2.5">
                  <span className="block text-[10px] text-slate-400">Promedio por propina</span>
                  <span className="text-sm font-bold text-white">1,50 €</span>
                </div>
              </div>

              {/* Simulación de la Tabla de Empleados */}
              <div className="space-y-2 text-xs">
                {/* Empleado con saldo pendiente */}
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
                  <div>
                    <span className="block font-bold text-white">Juan Perez</span>
                    <span className="text-[11px] text-slate-400">2 propinas · Saldo pendiente: <strong className="text-amber-300">2,00 €</strong></span>
                  </div>
                  <button className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow transition-all hover:bg-orange-600">
                    Pagar propinas
                  </button>
                </div>

                {/* Empleado al día */}
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3 opacity-75">
                  <div>
                    <span className="block font-bold text-white">Teresa Melo</span>
                    <span className="text-[11px] text-slate-400">0 propinas · Saldo pendiente: <strong className="text-slate-300">0,00 €</strong></span>
                  </div>
                  <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400">
                    Al día
                  </span>
                </div>
              </div>

              <p className="border-t border-white/5 pt-3 text-[11px] leading-relaxed text-slate-400">
                💡 Al hacer clic en <strong className="text-orange-400">&quot;Pagar propinas&quot;</strong>, el sistema debitará automáticamente el dinero recaudado directamente al IBAN vinculado del empleado. Para aquellos sin saldo pendiente, aparecerá el estado <strong className="text-slate-300">&quot;Al día&quot;</strong>.
              </p>
            </div>

            <div className="mt-2 flex gap-3">
              <button 
                onClick={() => setStep(3)} 
                className="w-1/3 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white transition-all hover:bg-white/5"
              >
                {t('OnboardingGuide.backStep') || '← Atrás'}
              </button>
              <button 
                onClick={() => router.push('/dashboard')} 
                className="w-2/3 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-orange-600"
              >
                {t('OnboardingGuide.finishBtn') || 'Ir a mi Panel General 🚀'}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
