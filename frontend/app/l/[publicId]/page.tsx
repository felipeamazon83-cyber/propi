'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import de from '../../../messages/de.json';
import en from '../../../messages/en.json';
import es from '../../../messages/es.json';
import fr from '../../../messages/fr.json';
import it from '../../../messages/it.json';
import pt from '../../../messages/pt.json';

type Public = {
  business_name: string;
  logo_url?: string;
  location_name: string;
  employees: { id: string; name: string; photo_url?: string }[];
  suggested_amounts: number[];
  minimum_amount: number;
  maximum_amount: number;
};

const messages: Record<string, any> = {
  es,
  en,
  fr,
  de,
  it,
  pt,
};

const LANG_OPTIONS = [
  { code: 'es', badge: 'ES', label: 'Español' },
  { code: 'en', badge: 'GB', label: 'English' },
  { code: 'fr', badge: 'FR', label: 'Français' },
  { code: 'de', badge: 'DE', label: 'Deutsch' },
  { code: 'it', badge: 'IT', label: 'Italiano' },
  { code: 'pt', badge: 'PT', label: 'Português' },
] as const;

type Lang = (typeof LANG_OPTIONS)[number]['code'];

const FALLBACK_PAY_LABEL: Record<Lang, string> = {
  es: 'Pagar',
  en: 'Pay',
  fr: 'Payer',
  de: 'Bezahlen',
  it: 'Paga',
  pt: 'Pagar',
};

const FALLBACK_LOADING_LABEL: Record<Lang, string> = {
  es: 'Cargando…',
  en: 'Loading…',
  fr: 'Chargement…',
  de: 'Wird geladen…',
  it: 'Caricamento…',
  pt: 'A carregar…',
};

const FALLBACK_ITEM_TEMPLATE: Record<Lang, string> = {
  es: 'Propina para {name}',
  en: 'Tip for {name}',
  fr: 'Pourboire pour {name}',
  de: 'Trinkgeld für {name}',
  it: 'Mancia per {name}',
  pt: 'Gorjeta para {name}',
};

export default function TipPage({ params }: { params: { publicId: string } }) {
  const [data, setData] = useState<Public>();
  const [employee, setEmployee] = useState<string>();
  const [amount, setAmount] = useState<number>();
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');
  const [lang, setLang] = useState<Lang>('es');
  const [menuOpen, setMenuOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentPack = messages[lang] ?? messages.es;
  const t = currentPack?.CustomerPay ?? {};
  const selectedEmployee = data?.employees.find((e) => e.id === employee);
  const activeOption = LANG_OPTIONS.find((item) => item.code === lang) ?? LANG_OPTIONS[0];

  useEffect(() => {
    api<Public>(`/public/locations/${params.publicId}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [params.publicId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function checkout() {
    if (!employee || !amount) return;
    try {
      const itemTemplate: string = t.stripeItemTitle ?? FALLBACK_ITEM_TEMPLATE[lang];
      const productName = selectedEmployee
        ? itemTemplate.replace('{name}', selectedEmployee.name)
        : (t.leaveTipHere ?? FALLBACK_ITEM_TEMPLATE[lang].replace(' {name}', ''));

      const r = await api<{ checkout_url: string }>('/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
          public_token: params.publicId,
          employee_id: employee,
          amount,
          locale: lang,
          product_name: productName,
        }),
      });
      location.href = r.checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar el pago');
    }
  }

  if (error) return <main className="p-8 text-center">{error}</main>;
  if (!data) {
    return <main className="p-8 text-center">{FALLBACK_LOADING_LABEL[lang]}</main>;
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      {/* Selector desplegable estilo cápsula */}
      <div className="relative flex justify-center" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-[#0d1b30] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-white/25"
        >
          <span className="text-[11px] font-extrabold tracking-wide text-slate-300">
            {activeOption.badge}
          </span>
          <span>{activeOption.label}</span>
          <span
            className={`ml-1 text-[10px] text-slate-400 transition-transform ${
              menuOpen ? 'rotate-180' : ''
            }`}
          >
            ▼
          </span>
        </button>

        {menuOpen && (
          <ul
            role="listbox"
            className="absolute top-12 z-20 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1b30] py-1 text-sm text-white shadow-xl"
          >
            {LANG_OPTIONS.map((item) => {
              const selected = item.code === lang;
              return (
                <li key={item.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setLang(item.code);
                      setMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition ${
                      selected
                        ? 'bg-orange-500/20 font-semibold text-orange-300'
                        : 'text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-[11px] font-extrabold text-slate-400">
                        {item.badge}
                      </span>
                      <span>{item.label}</span>
                    </span>
                    {selected && <span className="text-xs text-orange-400">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-gray-500">{data.location_name}</p>
      <h1 className="mt-1 text-center text-3xl font-black">{data.business_name}</h1>

      {!employee ? (
        <section className="mt-8">
          <h2 className="text-2xl font-bold">{t.whoAttendedYou ?? '¿Quién te atendió?'}</h2>
          <div className="mt-5 space-y-3">
            {data.employees.map((e) => (
              <button
                type="button"
                onClick={() => setEmployee(e.id)}
                className="card flex w-full items-center gap-3.5 text-left text-lg font-bold transition-all hover:border-orange-500/50"
                key={e.id}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-500">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
                <span>{e.name}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-8">
          <button
            type="button"
            className="text-sm underline"
            onClick={() => setEmployee(undefined)}
          >
            {t.changePerson ?? '← Cambiar persona'}
          </button>

          <h2 className="mt-4 text-2xl font-bold">
            {t.thanksForVisit ?? 'Gracias por tu visita 🧡'}
          </h2>
          <p className="mt-1 text-gray-600">
            {t.wouldYouLikeTip ?? '¿Quieres dejar una propina?'}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {data.suggested_amounts.map((v) => (
              <button
                type="button"
                onClick={() => {
                  setCustom('');
                  setAmount(v);
                }}
                className={`btn ${amount === v ? 'btn-primary' : 'btn-secondary'} text-xl`}
                key={v}
              >
                {v.toFixed(0)} €
              </button>
            ))}
          </div>

          <input
            className="field mt-3"
            type="number"
            min={data.minimum_amount}
            max={data.maximum_amount}
            placeholder={t.customAmountPlaceholder ?? 'Otro importe (€)'}
            value={custom}
            onChange={(e) => {
              const val = e.target.value;
              setCustom(val);
              setAmount(val ? Number(val) : undefined);
            }}
          />

          {amount ? (
            <button type="button" onClick={checkout} className="btn btn-primary mt-6 w-full">
              {`${t.payButton ?? FALLBACK_PAY_LABEL[lang]} ${amount.toFixed(2)} €`}
            </button>
          ) : null}
        </section>
      )}
    </main>
  );
}
