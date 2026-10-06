'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';

type Business = { id: string; name: string; legal_name?: string; country: string; currency: string; stripe_connected: boolean };
type Employee = { id: string; name: string; active: boolean };
type Location = { id: string; name: string; url: string; distribution_mode: string; employee_percentage: number; suggested_amounts: number[] };
type TipSummary = { count: number; tip_total: number; average: number };
type EmployeeSummary = { employee_id: string; employee_name: string; total_amount: number; tip_count: number };

export default function DashboardPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [tipSummary, setTipSummary] = useState<TipSummary>({ count: 0, tip_total: 0, average: 0 });
  const [employeeSummary, setEmployeeSummary] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function showMessage(text: string, isError = false) {
    setError(isError ? text : '');
    setMessage(isError ? '' : text);
  }

  async function loadDashboard() {
    try {
      const businesses = await api<{ id: string }[]>('/businesses', {}, true);
      if (!businesses[0]) return;
      const details = await api<Business>(`/businesses/${businesses[0].id}`, {}, true);
      const [team, places, summary, byEmployee] = await Promise.all([
        api<Employee[]>(`/businesses/${details.id}/employees`, {}, true),
        api<Location[]>(`/businesses/${details.id}/locations`, {}, true),
        api<TipSummary>(`/businesses/${details.id}/tips/summary`, {}, true),
        api<EmployeeSummary[]>(`/businesses/${details.id}/tips/summary-by-employee`, {}, true),
      ]);
      setBusiness(details);
      setEmployees(team);
      setLocations(places);
      setTipSummary(summary);
      setEmployeeSummary(byEmployee);
    } catch (caught) {
      showMessage(caught instanceof Error ? caught.message : 'No se pudo cargar el dashboard.', true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadDashboard(); }, []);

  async function saveBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get('name')),
      legal_name: String(data.get('legal_name') || '') || null,
      country: String(data.get('country')).toUpperCase(),
      currency: String(data.get('currency')).toUpperCase(),
    };
    try {
      if (business) await api(`/businesses/${business.id}`, { method: 'PUT', body: JSON.stringify(payload) }, true);
      else await api('/businesses', { method: 'POST', body: JSON.stringify(payload) }, true);
      showMessage('Negocio guardado correctamente.');
      await loadDashboard();
    } catch (caught) {
      showMessage(caught instanceof Error ? caught.message : 'No se pudo guardar el negocio.', true);
    }
  }

  async function addEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!business) return;
    const form = event.currentTarget;
    try {
      await api(`/businesses/${business.id}/employees`, { method: 'POST', body: JSON.stringify({ name: String(new FormData(form).get('name')) }) }, true);
      form.reset();
      showMessage('Empleado añadido.');
      await loadDashboard();
    } catch (caught) {
      showMessage(caught instanceof Error ? caught.message : 'No se pudo añadir el empleado.', true);
    }
  }

  async function addLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!business) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get('name')),
      type: String(data.get('type')),
      distribution_mode: String(data.get('mode')),
      fixed_employee_id: String(data.get('employee') || '') || null,
      employee_percentage: Number(data.get('percentage')),
      suggested_amounts: String(data.get('tips')).split(',').map(value => Number(value.trim())).filter(value => value > 0),
    };
    try {
      await api(`/businesses/${business.id}/locations`, { method: 'POST', body: JSON.stringify(payload) }, true);
      form.reset();
      showMessage('QR/NFC creado correctamente.');
      await loadDashboard();
    } catch (caught) {
      showMessage(caught instanceof Error ? caught.message : 'No se pudo crear la ubicación.', true);
    }
  }

  if (loading) return <main className="mx-auto max-w-5xl p-8">Cargando tu espacio…</main>;

  return <main className="glow mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-5 sm:py-10">
    <p className="brand text-xl">PROPI<span className="text-orange-400">.</span> <span className="text-sm font-bold text-orange-300">· Dashboard</span></p>
    <h1 className="mt-3 text-3xl font-black sm:text-4xl">{business ? business.name : 'Configura tu negocio'}</h1>
    <p className="mt-2 text-slate-400">Completa estos tres pasos para publicar tu primer QR de propinas.</p>
    {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {message && <p className="mt-5 rounded-lg bg-green-50 p-3 text-green-700">{message}</p>}
    {business && <section className="mt-8 grid gap-4 sm:grid-cols-3">
      <article className="card"><p className="text-sm text-slate-400">Propinas acumuladas</p><p className="mt-2 text-3xl font-black text-orange-300">{tipSummary.tip_total.toFixed(2)} {business.currency}</p><p className="mt-1 text-xs text-slate-500">Total recibido</p></article>
      <article className="card"><p className="text-sm text-slate-400">Cantidad de propinas</p><p className="mt-2 text-3xl font-black">{tipSummary.count}</p><p className="mt-1 text-xs text-slate-500">Pagos confirmados hoy</p></article>
      <article className="card"><p className="text-sm text-slate-400">Promedio por propina</p><p className="mt-2 text-3xl font-black">{tipSummary.average.toFixed(2)} {business.currency}</p><p className="mt-1 text-xs text-slate-500">Media del día</p></article>
    </section>}
    {business && <section className="card mt-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-black uppercase tracking-[.18em] text-orange-300">Equipo</p><h2 className="mt-1 text-xl font-bold">Propinas por empleado</h2></div><span className="text-sm text-slate-400">Histórico confirmado</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{employeeSummary.length ? employeeSummary.map((item) => <article className="rounded-xl border border-white/10 bg-white/[.03] p-4" key={item.employee_id}><div className="flex items-center justify-between gap-3"><span className="font-bold">{item.employee_name}</span><span className="text-lg font-black text-orange-300">{item.total_amount.toFixed(2)} {business.currency}</span></div><p className="mt-2 text-sm text-slate-400">{item.tip_count} {item.tip_count === 1 ? 'propina' : 'propinas'} recibidas</p></article>) : <p className="text-sm text-slate-400">Aún no hay propinas asignadas a empleados.</p>}</div></section>}
    <section className="card mt-8"><h2 className="text-xl font-bold">1. Datos del negocio</h2><form onSubmit={saveBusiness} className="mt-4 grid gap-3 sm:grid-cols-2"><label>Nombre comercial<input className="field mt-1" name="name" required defaultValue={business?.name} /></label><label>Razón social<input className="field mt-1" name="legal_name" defaultValue={business?.legal_name || ''} /></label><label>País<input className="field mt-1" name="country" required maxLength={2} defaultValue={business?.country || 'ES'} /></label><label>Moneda<input className="field mt-1" name="currency" required maxLength={3} defaultValue={business?.currency || 'EUR'} /></label><button className="btn btn-primary sm:col-span-2">{business ? 'Guardar datos' : 'Crear mi negocio'}</button></form></section>
    {business && <>
      <section className="card mt-5"><h2 className="text-xl font-bold">2. Equipo y cuenta de cobro</h2><p className="mt-1 text-sm text-slate-400">Stripe recopila las cuentas bancarias de forma segura; TIP nunca las almacena.</p><button className="btn btn-secondary mt-3" onClick={async () => { try { const result = await api<{ onboarding_url: string }>(`/stripe/connect?business_id=${business.id}`, { method: 'POST' }, true); window.location.assign(result.onboarding_url); } catch (caught) { showMessage(caught instanceof Error ? caught.message : 'No se pudo abrir Stripe.', true); } }}>{business.stripe_connected ? 'Gestionar Stripe' : 'Conectar Stripe'}</button><div className="mt-4 flex flex-wrap gap-2">{employees.map(employee => <span className="rounded-full bg-white/10 text-slate-200 px-3 py-2" key={employee.id}>{employee.name} · {employee.active ? 'Activo' : 'Inactivo'}</span>)}</div><form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={addEmployee}><input className="field min-w-0" name="name" required placeholder="Nombre del empleado" /><button className="btn btn-primary sm:w-auto">Añadir</button></form></section>
      <section className="card mt-5"><h2 className="text-xl font-bold">3. Mesa, QR y NFC</h2><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={addLocation}><input className="field" name="name" required placeholder="Mesa 1 / Barra / Terraza" /><select className="field" name="type"><option value="table">Mesa</option><option value="bar">Barra</option><option value="area">Zona</option></select><select className="field" name="mode"><option value="employee">Cliente elige empleado</option><option value="team">Fondo común de equipo</option><option value="custom">Reparto personalizado</option></select><select className="field" name="employee"><option value="">Sin empleado fijo</option>{employees.filter(employee => employee.active).map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select><label>% para empleado<input className="field mt-1" name="percentage" type="number" min="0" max="100" defaultValue="100" /></label><label>Propinas sugeridas<input className="field mt-1" name="tips" defaultValue="1,2,3,5" /></label><button className="btn btn-primary sm:col-span-2" disabled={!employees.length}>Crear QR/NFC</button></form><div className="mt-5 space-y-3">{locations.map(location => <article className="rounded-xl border border-white/10 p-4" key={location.id}><b>{location.name}</b><p className="mt-1 text-sm text-slate-400">{location.distribution_mode} · {location.employee_percentage}% empleado · {location.suggested_amounts.join(' €, ')} €</p><div className="mt-3 flex gap-2"><a className="btn btn-secondary" href={location.url} target="_blank">Probar QR</a><button className="btn btn-secondary" onClick={() => { void navigator.clipboard.writeText(location.url).then(() => showMessage('URL NFC copiada.')); }}>Copiar URL NFC</button></div></article>)}</div></section>
    </>}
  </main>;
}
