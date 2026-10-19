'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07182f] px-5 py-12 text-white">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0b2344] p-8 shadow-2xl">
        
        {/* Encabezado */}
        <div className="mb-6 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
            Guía de Inicio Rápido · Paso {step} de 4
          </span>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            {step === 1 && '1. Datos del Negocio y Stripe Connect'}
            {step === 2 && '2. Gestión de Equipo y Enlace IBAN'}
            {step === 3 && '3. Configuración de Mesas, QR y NFC'}
            {step === 4 && '4. Control y Pago de Propinas desde el Dashboard'}
          </h1>
        </div>

        {/* Indicador de pasos */}
        <div className="mb-8 grid grid-cols-2 gap-2 border-b border-white/10 pb-4 text-xs font-bold uppercase tracking-wider text-slate-400 sm:grid-cols-4 text-center">
          <button 
            onClick={() => setStep(1)} 
            className={`py-1.5 rounded-lg transition-colors ${step === 1 ? 'bg-orange-400/20 text-orange-300 border border-orange-400/30 font-bold' : 'hover:bg-white/5'}`}
          >
            1. Negocio & Stripe
          </button>
          <button 
            onClick={() => setStep(2)} 
            className={`py-1.5 rounded-lg transition-colors ${step === 2 ? 'bg-orange-400/20 text-orange-300 border border-orange-400/30 font-bold' : 'hover:bg-white/5'}`}
          >
            2. Equipo & IBAN
          </button>
          <button 
            onClick={() => setStep(3)} 
            className={`py-1.5 rounded-lg transition-colors ${step === 3 ? 'bg-orange-400/20 text-orange-300 border border-orange-400/30 font-bold' : 'hover:bg-white/5'}`}
          >
            3. Mesas & QR
          </button>
          <button 
            onClick={() => setStep(4)} 
            className={`py-1.5 rounded-lg transition-colors ${step === 4 ? 'bg-orange-400/20 text-orange-300 border border-orange-400/30 font-bold' : 'hover:bg-white/5'}`}
          >
            4. Dashboard
          </button>
        </div>

        {/* PASO 1: Datos del negocio & Stripe */}
        {step === 1 && (
          <div className="flex flex-col gap-5 text-slate-300">
            <p className="text-sm text-slate-300 leading-relaxed">
              En la sección <strong className="text-white">1. Datos del negocio</strong> de Configuración, registra el Nombre Comercial, Razón Social, País y Moneda. Define quién asumirá los costes de servicio de procesamiento.
            </p>
            
            <div className="rounded-xl border border-white/10 bg-[#07182f]/80 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-300 font-bold text-sm">1</span>
                <div>
                  <p className="text-xs font-bold text-white">Configura tu perfil</p>
                  <p className="text-xs text-slate-400">Rellena los datos básicos e sube el logo de tu local (PNG, JPG o WEBP).</p>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t border-white/5 pt-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-sm">2</span>
                <div>
                  <p className="text-xs font-bold text-white">Haz clic en &quot;Gestionar Stripe&quot;</p>
                  <p className="text-xs text-slate-400">Vincularás la cuenta bancaria de tu empresa para recibir los fondos de forma automática y segura.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setStep(2)} 
              className="mt-2 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600 transition-all shadow-lg"
            >
              Siguiente paso: Añadir equipo →
            </button>
          </div>
        )}

        {/* PASO 2: Equipo y enlace IBAN */}
        {step === 2 && (
          <div className="flex flex-col gap-5 text-slate-300">
            <p className="text-sm text-slate-300 leading-relaxed">
              En la sección <strong className="text-white">2. Equipo y cuenta de cobro</strong>, crea los perfiles de tus empleados para que puedan recibir sus propinas directamente.
            </p>

            <div className="rounded-xl border border-white/10 bg-[#07182f]/80 p-5 space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex justify-between items-center text-xs">
                <span className="font-semibold text-white">Eduardo Fernandez · Activo</span>
                <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  Pendiente IBAN 🔗
                </span>
              </div>
              
              <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                <li>Al escribir el nombre y pulsar <strong className="text-white">&quot;Añadir&quot;</strong>, se genera el registro del trabajador.</li>
                <li>Haz clic sobre la etiqueta <strong className="text-amber-300">&quot;Pendiente IBAN&quot;</strong> para copiar su enlace de invitación personalizado.</li>
                <li>Envia este enlace a tu empleado para que introduzca de forma 100% privada y segura sus datos bancarios a través de Stripe (Propi nunca los almacena).</li>
              </ul>
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
                className="w-2/3 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-all shadow-lg"
              >
                Siguiente paso: Crear mesas →
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: Mesa, QR y NFC */}
        {step === 3 && (
          <div className="flex flex-col gap-5 text-slate-300">
            <p className="text-sm text-slate-300 leading-relaxed">
              En la sección <strong className="text-white">3. Mesa, QR y NFC</strong>, configura cada punto de cobro (Mesas, Barra o Terraza) e imprime sus identificadores o grábalos en pegatinas NFC.
            </p>

            <div className="rounded-xl border border-white/10 bg-[#07182f]/80 p-5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                  <span className="font-bold text-white block">1. Asignación</span>
                  Elige si el cliente escoge al empleado o si la mesa pertenece a un empleado fijo.
                </div>
                <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                  <span className="font-bold text-white block">2. Propinas Sugeridas</span>
                  Establece las sugerencias rápidas (ej. 1, 2, 3, 5 €) y el % asignado.
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-white/10 rounded-lg text-slate-200">🔍 Probar QR</span>
                <span className="px-3 py-1 bg-white/10 rounded-lg text-slate-200">🔗 Copiar URL NFC</span>
                <span className="px-3 py-1 bg-orange-500 text-white font-bold rounded-lg">🎨 Tarjeta Mesa</span>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => setStep(2)} 
                className="w-1/3 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white hover:bg-white/5 transition-all"
              >
                ← Atrás
              </button>
              <button 
                onClick={() => setStep(4)} 
                className="w-2/3 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-all shadow-lg"
              >
                Siguiente paso: Dashboard →
              </button>
            </div>
          </div>
        )}

        {/* PASO 4: Dashboard y Payouts */}
        {step === 4 && (
          <div className="flex flex-col gap-5 text-slate-300">
            <p className="text-sm text-slate-300 leading-relaxed">
              Consulta el resumen de recaudación en tiempo real en tu <strong className="text-white">Dashboard</strong> y gestiona las liquidaciones de propinas para tu equipo.
            </p>

            <div className="rounded-xl border border-white/10 bg-[#07182f]/80 p-5 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                  <span className="block text-slate-400 text-[10px]">Acumuladas</span>
                  <span className="font-bold text-emerald-400 text-sm">1,00 €</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                  <span className="block text-slate-400 text-[10px]">Cantidad</span>
                  <span className="font-bold text-white text-sm">1</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                  <span className="block text-slate-400 text-[10px]">Promedio</span>
                  <span className="font-bold text-white text-sm">1,00 €</span>
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-xs text-slate-300 space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>Juan Perez</span>
                  <span className="text-emerald-400">Saldo: 0,00 €</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Una vez que el cliente paga la propina desde el QR/NFC, se refleja en el panel. Pulsa <strong className="text-white">&quot;Al día&quot;</strong> para liquidar saldos pendientes.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => setStep(3)} 
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
