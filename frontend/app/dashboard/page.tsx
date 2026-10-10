'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';

type Business = {
  id: string;
  name: string;
  logo_url?: string | null;
  currency: string;
};

type TipSummary = {
  total_amount: number;
  total_count: number;
  average: number;
};

type EmployeeSummary = {
  employee_id: string;
  name: string;
  total_amount: number;
  tips_count: number;
  stripe_account_id?: string | null;
  stripe_onboarding_completed?: boolean;
};

type DashboardSummaryResponse = {
  business: Business;
  summary: TipSummary;
  by_employee: EmployeeSummary[];
};

export default function DashboardPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [tipSummary, setTipSummary] = useState<TipSummary>({
    total_amount: 0,
    total_count: 0,
    average: 0,
  });
  const [employeeSummary, setEmployeeSummary] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados para modal de pago (Payout)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Obtener lista de negocios para extraer el ID activo
      const businesses = await api<{ id: string; logo_url?: string | null }[]>('/businesses', {}, true);
      if (!businesses || !businesses[0]) {
        setBusiness(null);
        return;
      }

      const activeBusinessId = businesses[0].id;

      // 2. Consulta unificada al endpoint de resumen
      const data = await api<DashboardSummaryResponse>(
        `/businesses/${activeBusinessId}/dashboard-summary`,
        {},
        true
      );

      // Si el endpoint summary no devuelve logo_url, usamos el obtenido en la lista /businesses
      const logoUrl = data.business.logo_url || businesses[0].logo_url || null;

      setBusiness({
        ...data.business,
        logo_url: logoUrl,
      });

      const count = data.summary.total_count || 0;
      const total = data.summary.total_amount || 0;
      const average = count > 0 ? total / count : 0;

      setTipSummary({
        total_amount: total,
        total_count: count,
        average: average,
      });

      setEmployeeSummary(data.by_employee || []);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'No se pudo cargar el dashboard.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Formateador auxiliar de moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: business?.currency || 'EUR',
    }).format(amount);
  };

  // Ejecución de la transferencia/payout
  async function handleExecutePayout() {
    if (!business || !selectedEmployee) return;
    setPayoutLoading(true);
    setPayoutError('');

    try {
      await api(
        `/businesses/${business.id}/employees/${selectedEmployee.employee_id}/payout`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: selectedEmployee.total_amount,
            currency: business.currency,
          }),
        },
        true
      );

      setPayoutSuccessMsg(
        `Pago de ${formatCurrency(selectedEmployee.total_amount)} enviado con éxito a ${selectedEmployee.name}.`
      );
      setSelectedEmployee(null);
      await loadDashboard(); // Recargar métricas tras el pago
    } catch (err) {
      setPayoutError(
        err instanceof Error ? err.message : 'Error al procesar la transferencia.'
      );
    } finally {
      setPayoutLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-8 text-slate-300">
        Cargando tu espacio…
      </main>
    );
  }

  return (
    <main className="glow mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-5 sm:py-10">
      {/* Cabecera / Marca con Logo del Restaurante y Botón Cerrar Sesión */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-orange-300">
            · Dashboard
          </p>

          <div className="mt-3 flex items-center gap-4">
            {/* Logo propio del Restaurante o Avatar por defecto */}
            {business?.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.name || 'Restaurante'}
                className="h-14 w-14 rounded-xl border border-white/10 object-cover shadow-md"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 text-2xl font-black text-orange-400">
                {business?.name?.charAt(0) || 'R'}
              </div>
            )}

            <div>
              <h1 className="text-3xl font-black text-white sm:text-4xl">
                {business ? business.name : 'Configura tu negocio'}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Consulta el rendimiento de tu equipo y gestiona el pago de propinas.
              </p>
            </div>
          </div>
        </div>


      </div>

      {/* Mensajes Globales */}
      {error && (
        <p className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-red-200">
          {error}
        </p>
      )}

      {payoutSuccessMsg && (
        <p className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
          {payoutSuccessMsg}
        </p>
      )}

      {/* Tarjetas Principales de Métricas */}
      {business && (
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="card">
            <p className="text-sm text-slate-400">Propinas acumuladas</p>
            <p className="mt-2 text-3xl font-black text-orange-300">
              {formatCurrency(tipSummary.total_amount)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Total recaudado</p>
          </article>

          <article className="card">
            <p className="text-sm text-slate-400">Cantidad de propinas</p>
            <p className="mt-2 text-3xl font-black text-white">{tipSummary.total_count}</p>
            <p className="mt-1 text-xs text-slate-500">Pagos confirmados</p>
          </article>

          <article className="card">
            <p className="text-sm text-slate-400">Promedio por propina</p>
            <p className="mt-2 text-3xl font-black text-white">
              {formatCurrency(tipSummary.average)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Media del periodo</p>
          </article>
        </section>
      )}

      {/* Tabla de Propinas por Empleado con Flujo de Payout */}
      {business && (
        <section className="card mt-6 border border-white/10 bg-slate-900/60 p-6 rounded-2xl shadow-xl">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-orange-400">Equipo</p>
              <h2 className="text-2xl font-black text-white">Propinas por empleado</h2>
            </div>
            <span className="text-xs text-slate-400">Histórico confirmado y liquidaciones</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3.5 rounded-l-lg">Empleado</th>
                  <th className="px-4 py-3.5">Estado IBAN</th>
                  <th className="px-4 py-3.5 text-center">Propinas Recibidas</th>
                  <th className="px-4 py-3.5 text-right">Monto Recaudado</th>
                  <th className="px-4 py-3.5 text-right rounded-r-lg">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {employeeSummary.length > 0 ? (
                  employeeSummary.map((emp) => {
                    const hasBalance = emp.total_amount > 0;
                    const canPay = hasBalance && emp.stripe_onboarding_completed;

                    return (
                      <tr key={emp.employee_id} className="transition-colors hover:bg-white/[0.02]">
                        <td className="px-4 py-4 font-semibold text-white">{emp.name}</td>

                        <td className="px-4 py-4">
                          {emp.stripe_onboarding_completed ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                              IBAN Listo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                              Pendiente IBAN
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-center text-slate-400">
                          {emp.tips_count} {emp.tips_count === 1 ? 'propina' : 'propinas'}
                        </td>

                        <td className="px-4 py-4 text-right text-base font-bold text-orange-400">
                          {formatCurrency(emp.total_amount)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedEmployee(emp)}
                            disabled={!canPay}
                            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                              canPay
                                ? 'bg-orange-500 text-slate-950 hover:bg-orange-400 shadow-lg shadow-orange-500/20'
                                : 'cursor-not-allowed bg-white/5 text-slate-500 border border-white/5'
                            }`}
                            title={
                              !hasBalance
                                ? 'Sin saldo acumulado para pagar'
                                : !emp.stripe_onboarding_completed
                                ? 'El empleado requiere vincular su IBAN'
                                : 'Pagar propinas acumuladas'
                            }
                          >
                            Pagar propinas
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Aún no hay propinas asignadas a empleados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal Confirmación de Pago */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Confirmar Pago de Propinas</h3>
            <p className="mt-2 text-sm text-slate-400">
              Vas a realizar una transferencia directa a la cuenta conectada del empleado.
            </p>

            <div className="my-5 rounded-xl border border-white/10 bg-black/40 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Empleado:</span>
                <span className="font-semibold text-white">{selectedEmployee.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Monto a pagar:</span>
                <span className="text-base font-bold text-orange-400">
                  {formatCurrency(selectedEmployee.total_amount)}
                </span>
              </div>
            </div>

            {payoutError && (
              <p className="mb-4 rounded-lg bg-red-500/20 p-3 text-xs text-red-400">
                {payoutError}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                disabled={payoutLoading}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecutePayout}
                disabled={payoutLoading}
                className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-orange-400 disabled:opacity-50"
              >
                {payoutLoading ? 'Procesando pago…' : 'Confirmar y Pagar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
