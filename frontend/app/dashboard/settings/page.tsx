'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
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
  onboarding_url?: string;
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

type SettingsSummary = {
  business: Business;
  employees: Employee[];
  locations: Location[];
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

  // Carga inicial optimizada con 1 sola petición al endpoint unificado
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const businesses = await api<{ id: string }[]>('/businesses', {}, true);

      if (!businesses[0]) {
        setBusiness(null);
        setEmployees([]);
        setLocations([]);
        return;
      }

      // Consulta directa al nuevo endpoint unificado
      const summary = await api<SettingsSummary>(
        `/businesses/${businesses[0].id}/settings-summary`,
        {},
        true
      );

      setBusiness(summary.business);
      setEmployees(summary.employees);
      setLocations(summary.locations);
    } catch (caught) {
      showMessage(caught instanceof Error ? caught.message : 'No se pudo cargar la configuración.', true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

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
        const updated = await api<Business>(
          `/businesses/${business.id}`,
          { method: 'PUT', body: JSON.stringify(payload) },
          true
        );
        setBusiness((prev) => (prev ? { ...prev, ...updated } : updated));
      } else {
        const created = await api<Business>('/businesses', { method: 'POST', body: JSON.stringify(payload) }, true);
        setBusiness(created);
      }
      showMessage('Negocio guardado correctamente.');
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
      const created = await api<Employee>(
        `/businesses/${business.id}/employees`,
        { method: 'POST', body: JSON.stringify({ name }) },
        true
      );

      form.reset();
      showMessage('Empleado añadido correctamente.');
      setEmployees((prev) => [...prev, created]);

      if (created.onboarding_url) {
        setActiveModalLink({ name: created.name, url: created.onboarding_url });
      }
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
      suggested_amounts: String(data.get('tips'))
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => value > 0),
    };

    try {
      const created = await api<Location>(
        `/businesses/${business.id}/locations`,
        { method: 'POST', body: JSON.stringify(payload) },
        true
      );

      form.reset();
      showMessage('QR/NFC creado correctamente.');
      setLocations((prev) => [...prev, created]);
    } catch (caught) {
      showMessage(caught instanceof Error ? caught.message : 'No se pudo crear la ubicación.', true);
    }
  }

  async function confirmDelete() {
    if (!business || !deleteModal) return;
    const target = deleteModal;
    setDeleting(true);

    try {
      if (target.type === 'employee') {
        await api(`/businesses/${business.id}/employees/${target.id}`, { method: 'DELETE' }, true);
        setEmployees((prev) => prev.filter((emp) => emp.id !== target.id));
        showMessage('Empleado eliminado correctamente.');
      } else {
        await api(`/businesses/${business.id}/locations/${target.id}`, { method: 'DELETE' }, true);
        setLocations((prev) => prev.filter((loc) => loc.id !== target.id));
        showMessage('Ubicación eliminada correctamente.');
      }
    } catch (caught) {
      showMessage(caught instanceof Error ? caught.message : 'No se pudo completar la eliminación.', true);
      await loadDashboard();
    } finally {
      setDeleteModal(null);
      setDeleting(false);
    }
  }

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
    void navigator.clipboard.writeText(activeModalLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <input className="field mt-1" name="name" required defaultValue={business?.name || ''} />
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

            {/* Guía interactiva de configuración NFC */}
            <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 sm:p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-lg">
                  📲
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">¿Quieres usar pegatinas o tarjetas NFC?</h3>
                  <p className="text-xs text-slate-400">Configura tus propios chips NFC en menos de 1 minuto</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                {/* Paso 1 */}
                <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-orange-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-400">
                      1
                    </span>
                    Comprar pegatinas
                  </div>
                  <p className="mt-1.5 text-xs text-slate-300">
                    Consigue pegatinas NFC neutras (tipo <b className="text-white">NTAG213 o NTAG215</b>). Cuestan menos de 0,50 €/ud en Amazon.
                  </p>
                </div>

                {/* Paso 2 */}
                <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-orange-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-400">
                      2
                    </span>
                    Descargar app gratuita
                  </div>
                  <p className="mt-1.5 text-xs text-slate-300">
                    Descarga <b className="text-white">NFC Tools</b> para grabar tus pegatinas fácilmente.
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <a
                      href="https://apps.apple.com/app/nfc-tools/id1252962749"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-white/20"
                    >
                      App Store ↗
                    </a>
                    <a
                      href="https://play.google.com/store/apps/details?id=com.wakdev.wdnfc"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-white/20"
                    >
                      Google Play ↗
                    </a>
                    <a
                      href="https://nfc.software/es"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-orange-500/20 px-2 py-1 text-[11px] font-semibold text-orange-300 transition-colors hover:bg-orange-500/30"
                    >
                      Web oficial ↗
                    </a>
                  </div>
                </div>

                {/* Paso 3 */}
                <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-orange-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-400">
                      3
                    </span>
                    Grabar la pegatina
                  </div>
                  <ol className="mt-1.5 list-inside list-decimal space-y-0.5 text-xs text-slate-300">
                    <li>Copia la <b>URL NFC</b> de la mesa.</li>
                    <li>Abre NFC Tools → <b>Escribir</b> → <b>Añadir registro</b> → <b>URL</b>.</li>
                    <li>Pega la URL y acerca tu móvil a la pegatina.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {locations.map((location) => {
                const publicUrl = typeof window !== 'undefined'
                  ? `${window.location.origin}/l/${location.public_token}`
                  : location.url;

                return (
                  <article className="rounded-xl border border-gray-200 p-4" key={location.id}>
                    <b>{location.name}</b>
                    <p className="mt-1 text-sm text-slate-400">
                      {location.distribution_mode} · {location.employee_percentage}% empleado ·{' '}
                      {location.suggested_amounts.join(' €, ')} €
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a className="btn btn-secondary" href={publicUrl} target="_blank" rel="noreferrer">
                        Probar QR ↗
                      </a>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          void navigator.clipboard.writeText(publicUrl).then(() =>
                            showMessage('URL NFC copiada. Abre NFC Tools para grabarla en tu pegatina.')
                          );
                        }}
                      >
                        Copiar URL NFC
                      </button>

                      {/* Opción B: Botón de Tarjeta Completa + Botón de Solo QR */}
                      <a
                        className="btn btn-primary inline-flex items-center gap-1.5"
                        href={`${apiUrl}/public/locations/${location.public_token}/card.png`}
                        download={`tarjeta-propi-${location.name}.png`}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Tarjeta Mesa 🎨
                      </a>

                      <button
                        type="button"
                        className="btn ml-auto border border-red-500/20 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20"
                        onClick={() => setDeleteModal({ type: 'location', id: location.id, name: location.name })}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Modal Enlace Stripe Connect */}
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

      {/* Modal Confirmación Eliminación */}
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
