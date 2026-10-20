'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useTranslation } from '../../context/LanguageContext';

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
  pending_amount: number;
  stripe_account_id?: string | null;
  stripe_onboarding_completed?: boolean;
};

type DashboardSummaryResponse = {
  business: Business;
  summary: TipSummary;
  by_employee: EmployeeSummary[];
};

export default function DashboardPage() {
  const { t } = useTranslation();

  const [business, setBusiness] = useState<Business | null>(null);
  const [tipSummary, setTipSummary] = useState<TipSummary>({
    total_amount: 0,
    total_count: 0,
    average: 0,
  });
  const [employeeSummary, setEmployeeSummary] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedMonth, setSelectedMonth] = useState('all');

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      setError('');
      // 1. Petición optimizada de negocios
      const businesses = await api<{ id: string; logo_url?: string | null }[]>('/businesses', {}, true);
      if (!businesses || !businesses[0]) {
        setBusiness(null);
        setLoading(false);
        return;
      }

      const activeBusinessId = businesses[0].id;

      // 2. Llamada directa al resumen
      const data = await api<DashboardSummaryResponse>(
        `/businesses/${activeBusinessId}/dashboard-summary`,
        {},
        true
      );

      // Priorizamos el logo_url de la lista de negocios que viene fresco de la BD
      const logoUrl = businesses[0].logo_url || data.business?.logo_url || null;

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: business?.currency || 'EUR',
    }).format(amount);
  };

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
            amount: selectedEmployee.pending_amount,
            currency: business.currency,
          }),
        },
        true
      );

      setPayoutSuccessMsg(
        `Pago de ${formatCurrency(selectedEmployee.pending_amount)} enviado con éxito a ${selectedEmployee.name}.`
      );
      setSelectedEmployee(null);
      await loadDashboard();
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
      <main className="glow mx-auto min-h-screen max-w-5xl px-4 py-6 text-slate-300 sm:px-5 sm:py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-lg bg-white/5"></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-28 rounded-2xl bg-white/5"></div>
            <div className="h-28 rounded-2xl bg-white/5"></div>
            <div className="h-28 rounded-2xl bg-white/5"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="glow mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-5 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-orange-300">
            {t('DashboardMain.badge') || '· Dashboard'}
          </p>

          <div className="mt-3 flex items-center gap-4">
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
                {t('DashboardMain.subtitle') || 'Consulta el rendimiento de tu equipo y gestiona el pago de propinas.'}
              </p>
            </div>
          </div>
        </div>
      </div>

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

      {business && (
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="card">
            <p className="text-sm text-slate-400">
              {t('DashboardMain.accumulatedTips') || 'Propinas acumuladas'}
            </p>
            <p className="mt-2 text-3xl font-black text-orange-300">
              {formatCurrency(tipSummary.total_amount)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {t('DashboardMain.totalCollected') || 'Total recaudado'}
            </p>
          </article>

          <article className="card">
            <p className="text-sm text-slate-400">
              {t('DashboardMain.tipsCount') || 'Cantidad de propinas'}
            </p>
            <p className="mt-2 text-3xl font-black text-white">{tipSummary.total_count}</p>
            <p className="mt-1 text-xs text-slate-500">
              {t('DashboardMain.confirmedPayments') || 'Pagos confirmados'}
            </p>
          </article>

          <article className="card">
            <p className="text-sm text-slate-400">
              {t('DashboardMain.avgPerTip') || 'Promedio por propina'}
            </p>
            <p className="mt-2 text-3xl font-black text-white">
              {formatCurrency(tipSummary.average)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {t('DashboardMain.periodAverage') || 'Media del periodo'}
            </p>
          </article>
        </section>
      )}

      {business && (
        <section className="card mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-orange-400">
                {t('DashboardMain.teamSection') || 'Equipo'}
              </p>
              <h2 className="text-2xl font-black text-white">
                {t('DashboardMain.teamTips') || 'Propinas por empleado'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {t('DashboardMain.filterMonth') || 'Filtrar mes:'}
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="all">{t('DashboardMain.allPeriods') || 'Todos los periodos'}</option>
                <option value="2026-10">{t('DashboardMain.october') || 'Octubre 2026'}</option>
                <option value="2026-09">{t('DashboardMain.september') || 'Septiembre 2026'}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="rounded-l-lg px-4 py-3.5">
                    {t('DashboardMain.colEmployee') || 'Empleado'}
                  </th>
                  <th className="px-4 py-3.5 text-center">
                    {t('DashboardMain.colReceived') || 'Propinas Recibidas'}
                  </th>
                  <th className="px-4 py-3.5 text-right">
                    {t('DashboardMain.colPaid') || 'Propinas Ya Pagadas'}
                  </th>
                  <th className="px-4 py-3.5 text-right">
                    {t('DashboardMain.colPending') || 'Saldo Pendiente'}
                  </th>
                  <th className="rounded-r-lg px-4 py-3.5 text-right">
                    {t('DashboardMain.colAction') || 'Acción'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {employeeSummary.length > 0 ? (
                  employeeSummary.map((emp) => {
                    const hasPendingBalance = emp.pending_amount > 0;
                    const canPay = hasPendingBalance && emp.stripe_onboarding_completed;

                    return (
                      <tr key={emp.employee_id} className="transition-colors hover:bg-white/[0.02]">
                        <td className="px-4 py-4 font-semibold text-white">{emp.name}</td>

                        <td className="px-4 py-4 text-center text-slate-400">
                          {emp.tips_count} {emp.tips_count === 1 ? 'propina' : 'propinas'}
                        </td>

                        <td className="px-4 py-4 text-right text-base font-bold text-emerald-400">
                          {formatCurrency(emp.total_amount)}
                        </td>

                        <td className="px-4 py-4 text-right text-base font-bold text-orange-400">
                          {formatCurrency(emp.pending_amount)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedEmployee(emp)}
                            disabled={!canPay}
                            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                              canPay
                                ? 'bg-orange-500 text-slate-950 hover:bg-orange-400 shadow-lg shadow-orange-500/20'
                                : 'cursor-not-allowed border border-white/5 bg-white/5 text-slate-500'
                            }`}
                          >
                            {hasPendingBalance ? 'Pagar propinas' : (t('DashboardMain.upToDate') || 'Al día')}
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

      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white">Confirmar Pago de Propinas</h3>
            <p className="mt-2 text-sm text-slate-400">
              Vas a realizar una transferencia directa del saldo pendiente a la cuenta conectada del empleado.
            </p>

            <div className="my-5 space-y-2 rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Empleado:</span>
                <span className="font-semibold text-white">{selectedEmployee.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Saldo pendiente a transferir:</span>
                <span className="text-base font-bold text-orange-400">
                  {formatCurrency(selectedEmployee.pending_amount)}
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
