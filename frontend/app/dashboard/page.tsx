'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

type Business = { id: string; name: string; currency: string };
type TipSummary = { count: number; tip_total: number; average: number };
type EmployeeSummary = {
  employee_id: string;
  employee_name: string;
  total_amount: number;
  tip_count: number;
};

export default function DashboardPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [tipSummary, setTipSummary] = useState<TipSummary>({
    count: 0,
    tip_total: 0,
    average: 0,
  });
  const [employeeSummary, setEmployeeSummary] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    try {
      // 1. Obtener los negocios del usuario
      const businesses = await api<{ id: string }[]>('/businesses', {}, true);
      if (!businesses || !businesses[0]) {
        setLoading(false);
        return;
      }

      // 2. Obtener detalles del negocio activo
      const details = await api<Business>(`/businesses/${businesses[0].id}`, {}, true);
      setBusiness(details);

      // 3. Consultar las métricas usando las rutas globales del backend
      const [summary, byEmployee] = await Promise.all([
        api<TipSummary>('/tips/summary', {}, true),
        api<EmployeeSummary[]>('/tips/summary-by-employee', {}, true),
      ]);

      setTipSummary(summary);
      setEmployeeSummary(byEmployee);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'No se pudo cargar el dashboard.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-8 text-slate-300">
        Cargando tu espacio…
      </main>
    );
  }

  return (
    <main className="glow mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-5 sm:py-10">
      {/* Cabecera / Marca */}
      <p className="flex items-center gap-3">
        <img className="brand-logo-image" src="/propi-logo.png" alt="Propi" />
        <span className="text-sm font-bold text-orange-300">· Dashboard</span>
      </p>

      {/* Título y Subtítulo */}
      <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
        {business ? business.name : 'Configura tu negocio'}
      </h1>
      <p className="mt-2 text-slate-400">
        Consulta el rendimiento de tu equipo y las propinas recibidas.
      </p>

      {/* Mensaje de Error */}
      {error && (
        <p className="mt-5 rounded-lg bg-red-500/10 p-3 text-red-200 border border-red-500/20">
          {error}
        </p>
      )}

      {/* Tarjetas Principales de Métricas */}
      {business && (
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="card">
            <p className="text-sm text-slate-400">Propinas acumuladas</p>
            <p className="mt-2 text-3xl font-black text-orange-300">
              {tipSummary.tip_total.toFixed(2)} {business.currency}
            </p>
            <p className="mt-1 text-xs text-slate-500">Total recibido</p>
          </article>

          <article className="card">
            <p className="text-sm text-slate-400">Cantidad de propinas</p>
            <p className="mt-2 text-3xl font-black text-white">{tipSummary.count}</p>
            <p className="mt-1 text-xs text-slate-500">Pagos confirmados hoy</p>
          </article>

          <article className="card">
            <p className="text-sm text-slate-400">Promedio por propina</p>
            <p className="mt-2 text-3xl font-black text-white">
              {tipSummary.average.toFixed(2)} {business.currency}
            </p>
            <p className="mt-1 text-xs text-slate-500">Media del día</p>
          </article>
        </section>
      )}

      {/* Desglose de Propinas por Empleado */}
      {business && (
        <section className="card mt-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[.18em] text-orange-300">
                Equipo
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">
                Propinas por empleado
              </h2>
            </div>
            <span className="text-sm text-slate-400">Histórico confirmado</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {employeeSummary.length ? (
              employeeSummary.map((item) => (
                <article
                  className="rounded-xl border border-white/10 bg-white/[.03] p-4"
                  key={item.employee_id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-white">{item.employee_name}</span>
                    <span className="text-lg font-black text-orange-300">
                      {item.total_amount.toFixed(2)} {business.currency}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {item.tip_count}{' '}
                    {item.tip_count === 1 ? 'propina' : 'propinas'} recibidas
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-400">
                Aún no hay propinas asignadas a empleados.
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
