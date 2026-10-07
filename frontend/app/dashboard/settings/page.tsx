'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../../lib/api';

type Business = {
  id: string;
  name: string;
  legal_name?: string;
  country: string;
  currency: string;
  fee_payer?: 'business' | 'customer';
  stripe_connected: boolean;
};

type Employee = {
  id: string;
  name: string;
  active: boolean;
  stripe_account_id?: string | null;
  stripe_onboarding_completed: boolean;
};

type Location = {
  id: string;
  name: string;
  url: string;
  public_token: string;
  distribution_mode: string;
  employee_percentage: number;
  suggested_amounts: number[];
};

type DeleteTarget = {
  type: 'employee' | 'location';
  id: string;
  name: string;
} | null;

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Estados para modal de onboarding de Stripe por empleado
  const [activeModalLink, setActiveModalLink] = useState<{ name: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Estado para modal de confirmación de eliminación
  const [deleteModal, setDeleteModal] = useState<DeleteTarget>(null);
  const [deleting, setDeleting] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

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
      showMessage(caught instanceof Error ? caught.message : 'No se pudo cargar la configuración.', true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function saveBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get('name')),
      legal_name: String(data.get('legal_name') || '') || null,
      country: String(data.get('country')).toUpperCase(),
      currency: String(data.get('currency')).toUpperCase(),
      fee_payer: String(data.get('fee_payer') || 'business'),
    };

    try {
      if (business) {
        await api(`/businesses/${business.id}`, { method: 'PUT', body: JSON.stringify(payload) }, true);
      } else {
        await api('/businesses', { method: 'POST', body: JSON.stringify(payload) }, true);
      }
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
    const name = String(new FormData(form).get('name')).trim();

    try {
      const created = await api<{
        id: string;
        name: string;
        active: boolean;
        stripe_account_id?: string;
        stripe_onboarding_completed: boolean;
        onboarding_url?: string;
      }>(
        `/businesses/${business.id}/employees`,
        { method: 'POST', body: JSON.stringify({ name }) },
        true
      );

      form.reset();
      showMessage('Empleado añadido correctamente.');
      await loadDashboard();

      // Abrir modal con la URL de vinculación de IBAN si está disponible
      if (created.onboarding_url) {
        setActiveModalLink({ name: created.name, url: created.onboarding_url });
      }
    } catch (caught) {
      showMessage(caught instanceof Error ? caught.message : 'No se pudo añadir el empleado.', true);
    }
  }

  // Confirmar y procesar eliminación
  async function confirmDelete() {
    if (!business || !deleteModal) return;
    setDeleting(true);

    try {
      if (deleteModal.type === 'employee') {
        await api(`/businesses/${business.id}/employees/${deleteModal.id}`, { method: 'DELETE' }, true);
        showMessage('Empleado eliminado correctamente.');
      } else {
        await api(`/businesses/${business.id}/locations/${deleteModal.id}`, { method: 'DELETE' }, true);
        showMessage('Ubicación eliminada correctamente.');
      }
      
      // Cerrar modal inmediatamente tras eliminar
      setDeleteModal(null);

      // Refrescar lista de datos
      await loadDashboard();
    } catch (caught) {
      // Cerrar modal aunque ocurra un error
      setDeleteModal(null);
      showMessage(caught instanceof Error ? caught.message : 'No se pudo completar la eliminación.', true);
    } finally {
      setDeleting(false);
    }
  }

  // Solicitar nuevo enlace de vinculación cuando el empleado lo necesite
  async function handleReissueLink(employee: Employee) {
    if (!business) return;

    try {
      const res = await api<{ onboarding_url: string }>(
        `/businesses/${business.id}/employees/${employee.id}/onboarding-link`,
        {},
        true
      );
      setActiveModalLink({ name: employee.name, url: res.onboarding_url });
    } catch (caught) {
      showMessage(
        caught instanceof Error
          ? caught.message
          : 'No se pudo generar un nuevo enlace de vinculación.',
        true
      );
    }
  }

  function handleCopyLink() {
    if (!activeModalLink) return;
    navigator.clipboard.writeText(activeModalLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      suggested_amounts: String(data.get('tips'))
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => value > 0),
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

  if (loading) return <main className="glow mx-auto min-h-screen max-w-5xl p-5 sm:p-8">Cargando configuración…</main>;

  return (
    <main className="glow mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-5 sm:py-10">
      <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-3">
            <img className="brand-logo-image" src="/propi-logo.png" alt="Propi" />
            <span className="text-sm font-bold text-orange-300">· Configuración</span>
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">{business ? business.name : 'Configura tu negocio'}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
            Ajusta los datos de tu empresa, integra Stripe y gestiona tus ubicaciones QR.
          </p>
        </div>
        <a className="btn btn-secondary w-full sm:w-auto" href="/dashboard">Volver al dashboard</a>
      </header>

      {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      {message && <p className="mt-5 rounded-lg bg-green-50 p-3 text-green-700">{message}</p>}

      <section className="card mt-6 sm:mt-8">
        <h2 className="text-xl font-bold">1. Datos del negocio</h2>
        <form onSubmit={saveBusiness} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            Nombre comercial
            <input className="field mt-1" name="name" required defaultValue={business?.name} />
          </label>
          <label>
            Razón social
            <input className="field mt-1" name="legal_name" defaultValue={business?.legal_name || ''} />
          </label>
          <label>
            País
            <input className="field mt-1" name="country" required maxLength={2} defaultValue={business?.country || 'ES'} />
          </label>
          <label>
            Moneda
            <input className="field mt-1" name="currency" required maxLength={3} defaultValue={business?.currency || 'EUR'} />
          </label>
          <label className="sm:col-span-2">
            Asignación de comisión por servicio (0,20 €)
            <select className="field mt-1" name="fee_payer" defaultValue={business?.fee_payer || 'business'}>
              <option value="business">El Restaurante (Se descuenta del total recaudado)</option>
              <option value="customer">El Cliente (Se añade un cargo extra de 0,20 € en la pasarela de pago)</option>
            </select>
          </label>
          <button className="btn btn-primary sm:col-span-2">{business ? 'Guardar datos' : 'Crear mi negocio'}</button>
        </form>
      </section>

      {business && (
        <>
          <section className="card mt-5">
            <h2 className="text-xl font-bold">2. Equipo y cuenta de cobro</h2>
            <p className="mt-1 text-sm text-slate-400">
              Stripe recopila las cuentas bancarias de forma segura; TIP nunca las almacena.
            </p>
            <button
              className="btn btn-secondary mt-3"
              onClick={async () => {
                try {
                  const result = await api<{ onboarding_url: string }>(
                    `/stripe/connect?business_id=${business.id}`,
                    { method: 'POST' },
                    true
                  );
                  window.location.assign(result.onboarding_url);
                } catch (caught) {
                  showMessage(caught instanceof Error ? caught.message : 'No se pudo abrir Stripe.', true);
                }
              }}
            >
              {business.stripe_connected ? 'Gestionar Stripe' : 'Conectar Stripe'}
            </button>

            {/* Chips de Empleados con estado de IBAN de Stripe y opción de eliminar */}
            <div className="mt-4 flex flex-wrap gap-2">
              {employees.length ? (
                employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 text-slate-200"
                  >
                    <span className="font-semibold text-white">{employee.name}</span>
                    <span className="text-xs opacity-60">· {employee.active ? 'Activo' : 'Inactivo'}</span>

                    {employee.stripe_onboarding_completed ? (
                      <span className="ml-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                        IBAN Listo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReissueLink(employee)}
                        className="ml-1 flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/20 px-2.5 py-0.5 text-xs font-semibold text-orange-300 transition-colors hover:bg-orange-500/30"
                        title="Haz clic para ver o copiar el enlace de vinculación"
                      >
                        <span>Pendiente IBAN</span>
                        <span>🔗</span>
                      </button>
                    )}

                    {/* Botón para eliminar empleado */}
                    <button
                      type="button"
                      onClick={() => setDeleteModal({ type: 'employee', id: employee.id, name: employee.name })}
                      className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                      title={`Eliminar a ${employee.name}`}
                    >
                      ✕
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No hay empleados registrados en este negocio.</p>
              )}
            </div>

            <form className="mt-4 flex gap-2" onSubmit={addEmployee}>
              <input className="field" name="name" required placeholder="Nombre del empleado" />
              <button className="btn btn-primary">Añadir</button>
            </form>
          </section>

          <section className="card mt-5">
            <h2 className="text-xl font-bold">3. Mesa, QR y NFC</h2>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={addLocation}>
              <input className="field" name="name" required placeholder="Mesa 1 / Barra / Terraza" />
              <select className="field" name="type">
                <option value="table">Mesa</option>
                <option value="bar">Barra</option>
                <option value="area">Zona</option>
              </select>
              <select className="field" name="mode">
                <option value="employee">Cliente elige empleado</option>
                <option value="team">Fondo común de equipo</option>
                <option value="custom">Reparto personalizado</option>
              </select>
              <select className="field" name="employee">
                <option value="">Sin empleado fijo</option>
                {employees
                  .filter((employee) => employee.active)
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
              </select>
              <label>
                % para empleado
                <input className="field mt-1" name="percentage" type="number" min="0" max="100" defaultValue="100" />
              </label>
              <label>
                Propinas sugeridas
                <input className="field mt-1" name="tips" defaultValue="1,2,3,5" />
              </label>
              <button className="btn btn-primary sm:col-span-2" disabled={!employees.length}>
                Crear QR/NFC
              </button>
            </form>
            <div className="mt-5 space-y-3">
              {locations.map((location) => (
                <article className="rounded-xl border border-gray-200 p-4" key={location.id}>
                  <b>{location.name}</b>
                  <p className="mt-1 text-sm text-slate-400">
                    {location.distribution_mode} · {location.employee_percentage}% empleado ·{' '}
                    {location.suggested_amounts.join(' €, ')} €
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a className="btn btn-secondary" href={location.url} target="_blank" rel="noreferrer">
                      Probar QR
                    </a>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(location.url).then(() => showMessage('URL NFC copiada.'));
                      }}
                    >
                      Copiar URL NFC
                    </button>
                    <a
                      className="btn btn-primary inline-flex items-center gap-1.5"
                      href={`${apiUrl}/public/locations/${location.public_token}/qr.png`}
                      download={`tip-${location.name}.png`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar QR
                    </a>
                    {/* Botón para eliminar ubicación */}
                    <button
                      type="button"
                      className="btn bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors ml-auto"
                      onClick={() => setDeleteModal({ type: 'location', id: location.id, name: location.name })}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Modal / Ventana Emergente de Enlace de Stripe Connect */}
      {activeModalLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              Vincular IBAN de {activeModalLink.name}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Comparte este enlace con el empleado para que ingrese su IBAN en Stripe y pueda recibir sus propinas directamente:
            </p>

            <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 p-2">
              <input
                type="text"
                readOnly
                value={activeModalLink.url}
                className="w-full bg-transparent px-2 text-xs text-slate-300 outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="whitespace-nowrap rounded bg-orange-500 px-3 py-1 text-xs font-bold text-slate-950 transition-colors hover:bg-orange-400"
              >
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <a
                href={activeModalLink.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
              >
                Abrir enlace ↗
              </a>
              <button
                onClick={() => setActiveModalLink(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              ¿Eliminar {deleteModal.type === 'employee' ? 'empleado' : 'ubicación'}?
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              ¿Estás seguro de que deseas eliminar <strong className="text-white">{deleteModal.name}</strong>?
              Esta acción no se puede deshacer.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
