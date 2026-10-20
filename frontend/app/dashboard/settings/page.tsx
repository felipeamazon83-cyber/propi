'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useTranslation } from '../../../context/LanguageContext';

type Business = {
  id: string;
  name: string;
  legal_name?: string;
  logo_url?: string | null;
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
  const { t } = useTranslation();

  const [business, setBusiness] = useState<Business | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Estado para la vista previa del logo del restaurante
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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

      // Consulta directa al endpoint unificado
      const summary = await api<SettingsSummary>(
        `/businesses/${businesses[0].id}/settings-summary`,
        {},
        true
      );

      setBusiness(summary.business);
      setLogoPreview(summary.business.logo_url || null);
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

  // Manejador para cargar y convertir la imagen del logo a Base64
  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showMessage('La imagen no debe superar los 2 MB.', true);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setLogoPreview(base64String);
    };
    reader.readAsDataURL(file);
  }

  async function saveBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get('name')),
      legal_name: String(data.get('legal_name') || '') || null,
      logo_url: logoPreview || null,
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
      showMessage('Datos del negocio guardados correctamente.');
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
        { method: 'GET' },
        true
      );

      if (res?.onboarding_url) {
        setActiveModalLink({ name: employee.name, url: res.onboarding_url });
      } else {
        showMessage('No se pudo obtener el enlace de registro de Stripe.', true);
      }
    } catch (caught) {
      const errorMsg = caught instanceof Error ? caught.message : '';

      if (
        errorMsg.includes('caducado') ||
        errorMsg.includes('400') ||
        errorMsg.includes('404')
      ) {
        showMessage(
          `El enlace de vinculación para ${employee.name} ha caducado o no se completó. Por favor, elimina al empleado (pulsando la ✕) y vuelve a añadirlo para generar un enlace totalmente nuevo.`,
          true
        );
      } else {
        showMessage(errorMsg || 'No se pudo generar el enlace de vinculación.', true);
      }
    }
  }

  function handleCopyLink() {
    if (!activeModalLink) return;
    void navigator.clipboard.writeText(activeModalLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <main className="glow mx-auto min-h-screen max-w-5xl p-5 sm:p-8 text-slate-300">Cargando configuración…</main>;

  return (
    <main className="glow mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-5 sm:py-10">
      <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-orange-300">
            · {t('Settings.sectionBadge')}
          </p>

          <div className="mt-3">
            <h1 className="text-3xl font-black sm:text-4xl text-white">{business ? business.name : 'Configura tu negocio'}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {t('Settings.subtitle')}
            </p>
          </div>
        </div>
      </header>

      {error && <p className="mt-5 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-400">{error}</p>}
      {message && <p className="mt-5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-400">{message}</p>}

      <section className="card mt-6 sm:mt-8">
        <h2 className="text-xl font-bold text-white">{t('Settings.section1Title')}</h2>
        <form onSubmit={saveBusiness} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            {t('Settings.tradeName')}
            <input className="field mt-1" name="name" required defaultValue={business?.name || ''} />
          </label>
          <label>
            {t('Settings.legalName')}
            <input className="field mt-1" name="legal_name" defaultValue={business?.legal_name || ''} />
          </label>

          {/* Subida de Logo Personalizado */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300">{t('Settings.logoLabel')}</label>
            <div className="mt-2 flex items-center gap-4">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Vista previa del logo"
                  className="h-16 w-16 rounded-xl border border-white/10 object-cover shadow"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 text-2xl font-bold text-orange-400">
                  {business?.name?.charAt(0) || 'R'}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageChange}
                  className="text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-orange-300 hover:file:bg-orange-500/30"
                />
                <span className="text-[11px] text-slate-500">{t('Settings.logoFormats')}</span>
              </div>
            </div>
          </div>

          <label>
            {t('Settings.country')}
            <input className="field mt-1" name="country" required maxLength={2} defaultValue={business?.country || 'ES'} />
          </label>
          <label>
            {t('Settings.currency')}
            <input className="field mt-1" name="currency" required maxLength={3} defaultValue={business?.currency || 'EUR'} />
          </label>

          <label className="sm:col-span-2 block">
            {t('Settings.feeTitle')}
            <p className="mt-1 text-xs font-normal text-slate-400">
              {t('Settings.feeSubtitle')}
            </p>
            <select
              className="field mt-2 w-full"
              name="fee_payer"
              key={business?.fee_payer || 'business'}
              defaultValue={business?.fee_payer || 'business'}
            >
              <option value="business">{t('Settings.feeMerchant')}</option>
              <option value="customer">{t('Settings.feeCustomer')}</option>
            </select>
          </label>

          <button className="btn btn-primary sm:col-span-2">{business ? t('Settings.saveData') : 'Crear mi negocio'}</button>
        </form>
      </section>

      {business && (
        <>
          <section className="card mt-5">
            <h2 className="text-xl font-bold text-white">{t('Settings.section2Title')}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {t('Settings.stripeNotice')}
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
              {business.stripe_connected ? t('Settings.manageStripe') : 'Conectar Stripe'}
            </button>

            <div className="mt-4 flex flex-wrap gap-2">
              {employees.length ? (
                employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 text-slate-200"
                  >
                    <span className="font-semibold text-white">{employee.name}</span>
                    <span className="text-xs opacity-60">· {employee.active ? t('Settings.activeStatus') : 'Inactivo'}</span>

                    {employee.stripe_onboarding_completed ? (
                      <span className="ml-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                        IBAN Listo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleReissueLink(employee)}
                        className="ml-1 flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/20 px-2.5 py-0.5 text-xs font-semibold text-orange-300 transition-colors hover:bg-orange-500/30 active:scale-95 cursor-pointer"
                        title="Haz clic para ver o copiar el enlace de vinculación de IBAN"
                      >
                        <span>{t('Settings.pendingIban')}</span>
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
              <button className="btn btn-primary">{t('Settings.addMember')}</button>
            </form>
          </section>

          <section className="card mt-5">
            <h2 className="text-xl font-bold text-white">{t('Settings.section3Title')}</h2>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={addLocation}>
              <input className="field" name="name" required placeholder="Mesa 1 / Barra / Terraza" />
              <select className="field" name="type">
                <option value="table">{t('Settings.tableLabel')}</option>
                <option value="bar">{t('Settings.barLabel')}</option>
                <option value="area">{t('Settings.zoneLabel')}</option>
              </select>
              <select className="field" name="mode">
                <option value="employee">{t('Settings.modeClientChoice')}</option>
                <option value="team">{t('Settings.modePool')}</option>
                <option value="custom">{t('Settings.modeCustom')}</option>
              </select>
              <select className="field" name="employee">
                <option value="">{t('Settings.modeNoEmployee')}</option>
                {employees
                  .filter((employee) => employee.active)
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
              </select>
              <label>
                {t('Settings.employeeShare')}
                <input className="field mt-1" name="percentage" type="number" min="0" max="100" defaultValue="100" />
              </label>
              <label>
                {t('Settings.suggestedTips')}
                <input className="field mt-1" name="tips" defaultValue="1,2,3,5" />
              </label>
              <button className="btn btn-primary sm:col-span-2" disabled={!employees.length}>
                {t('Settings.createQrNfc')}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 sm:p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-lg">
                  📲
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">{t('Settings.nfcBoxTitle')}</h3>
                  <p className="text-xs text-slate-400">{t('Settings.nfcBoxSubtitle')}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-orange-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-400">
                      1
                    </span>
                    {t('Settings.nfcStep1Title')}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-300">
                    {t('Settings.nfcStep1Desc')}
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-orange-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-400">
                      2
                    </span>
                    {t('Settings.nfcStep2Title')}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-300">
                    {t('Settings.nfcStep2Desc')}
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
                      {t('Settings.officialWeb')}
                    </a>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-orange-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-400">
                      3
                    </span>
                    {t('Settings.nfcStep3Title')}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-300">
                    {t('Settings.nfcStep3Desc')}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {locations.map((location) => {
                const publicUrl = typeof window !== 'undefined'
                  ? `${window.location.origin}/l/${location.public_token}`
                  : location.url;

                return (
                  <article className="rounded-xl border border-white/10 bg-white/5 p-4" key={location.id}>
                    <b className="text-white">{location.name}</b>
                    <p className="mt-1 text-sm text-slate-400">
                      {location.distribution_mode} · {location.employee_percentage}% empleado ·{' '}
                      {location.suggested_amounts.join(' €, ')} €
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a className="btn btn-secondary" href={publicUrl} target="_blank" rel="noreferrer">
                        {t('Settings.testQr')}
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
                        {t('Settings.copyNfcUrl')}
                      </button>

                      <a
                        className="btn btn-primary inline-flex items-center gap-1.5"
                        href={`${apiUrl}/public/locations/${location.public_token}/card.png`}
                        download={`tarjeta-propi-${location.name}.png`}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {t('Settings.tableCard')}
                      </a>

                      <button
                        type="button"
                        className="btn ml-auto border border-red-500/20 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20"
                        onClick={() => setDeleteModal({ type: 'location', id: location.id, name: location.name })}
                      >
                        {t('Settings.delete')}
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
