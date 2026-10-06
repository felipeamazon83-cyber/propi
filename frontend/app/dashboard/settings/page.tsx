'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';

type Business = { id: string; name: string; legal_name?: string; country: string; currency: string; stripe_connected: boolean };
type Employee = { id: string; name: string; active: boolean };
type Location = { id: string; name: string; url: string; distribution_mode: string; employee_percentage: number; suggested_amounts: number[] };

export default function DashboardPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
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
      const [team, places] = await Promise.all([
        api<Employee[]>(`/businesses/${details.id}/employees`, {}, true),
        api<Location[]>(`/businesses/${details.id}/locations`, {}, true),
      ]);
      setBusiness(details);
      setEmployees(team);
      setLocations(places);
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

  return <main className="mx-auto max-w-5xl px-5 py-10">
    <p className="font-bold text-green-600">PROPI · Configuración</p>
    <h1 className="mt-2 text-4xl font-black">{business ? business.name : 'Configura tu negocio'}</h1>
    <p className="mt-2 text-gray-600">Completa estos tres pasos para publicar tu primer QR de propinas.</p>
    {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {message && <p className="mt-5 rounded-lg bg-green-50 p-3 text-green-700">{message}</p>}
    <section className="card mt-6"><h2 className="text-xl font-bold">1. Datos del negocio</h2><form onSubmit={saveBusiness} className="mt-4 grid gap-3 sm:grid-cols-2"><label>Nombre comercial<input className="field mt-1" name="name" required defaultValue={business?.name} /></label><label>Razón social<input className="field mt-1" name="legal_name" defaultValue={business?.legal_name || ''} /></label><label>País<input className="field mt-1" name="country" required maxLength={2} defaultValue={business?.country || 'ES'} /></label><label>Moneda<input className="field mt-1" name="currency" required maxLength={3} defaultValue={business?.currency || 'EUR'} /></label><button className="btn btn-primary sm:col-span-2">{business ? 'Guardar datos' : 'Crear mi negocio'}</button></form></section>
    {business && <>
      <section className="card mt-5"><h2 className="text-xl font-bold">2. Equipo y cuenta de cobro</h2><p className="mt-1 text-sm text-gray-600">Stripe recopila las cuentas bancarias de forma segura; TIP nunca las almacena.</p><button className="btn btn-secondary mt-3" onClick={async () => { try { const result = await api<{ onboarding_url: string }>(`/stripe/connect?business_id=${business.id}`, { method: 'POST' }, true); window.location.assign(result.onboarding_url); } catch (caught) { showMessage(caught instanceof Error ? caught.message : 'No se pudo abrir Stripe.', true); } }}>{business.stripe_connected ? 'Gestionar Stripe' : 'Conectar Stripe'}</button><div className="mt-4 flex flex-wrap gap-2">{employees.map(employee => <span className="rounded-full bg-gray-100 px-3 py-2" key={employee.id}>{employee.name} · {employee.active ? 'Activo' : 'Inactivo'}</span>)}</div><form className="mt-4 flex gap-2" onSubmit={addEmployee}><input className="field" name="name" required placeholder="Nombre del empleado" /><button className="btn btn-primary">Añadir</button></form></section>
      <section className="card mt-5"><h2 className="text-xl font-bold">3. Mesa, QR y NFC</h2><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={addLocation}><input className="field" name="name" required placeholder="Mesa 1 / Barra / Terraza" /><select className="field" name="type"><option value="table">Mesa</option><option value="bar">Barra</option><option value="area">Zona</option></select><select className="field" name="mode"><option value="employee">Cliente elige empleado</option><option value="team">Fondo común de equipo</option><option value="custom">Reparto personalizado</option></select><select className="field" name="employee"><option value="">Sin empleado fijo</option>{employees.filter(employee => employee.active).map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select><label>% para empleado<input className="field mt-1" name="percentage" type="number" min="0" max="100" defaultValue="100" /></label><label>Propinas sugeridas<input className="field mt-1" name="tips" defaultValue="1,2,3,5" /></label><button className="btn btn-primary sm:col-span-2" disabled={!employees.length}>Crear QR/NFC</button></form><div className="mt-5 space-y-3">{locations.map(location => <article className="rounded-xl border border-gray-200 p-4" key={location.id}><b>{location.name}</b><p className="mt-1 text-sm text-gray-600">{location.distribution_mode} · {location.employee_percentage}% empleado · {location.suggested_amounts.join(' €, ')} €</p><div className="mt-3 flex gap-2"><a className="btn btn-secondary" href={location.url} target="_blank">Probar QR</a><button className="btn btn-secondary" onClick={() => { void navigator.clipboard.writeText(location.url).then(() => showMessage('URL NFC copiada.')); }}>Copiar URL NFC</button></div></article>)}</div></section>
    </>}
  </main>;
}
