'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
// Ajusta la ruta según dónde guardes tu objeto `messages` (por ejemplo: ../../../lib/messages)
import { messages } from '../../../lib/messages';

type Public = {
  business_name: string;
  logo_url?: string;
  location_name: string;
  employees: { id: string; name: string; photo_url?: string }[];
  suggested_amounts: number[];
  minimum_amount: number;
  maximum_amount: number;
};

const LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt'] as const;
type Lang = (typeof LANGS)[number];

export default function TipPage({ params }: { params: { publicId: string } }) {
  const [data, setData] = useState<Public>();
  const [employee, setEmployee] = useState<string>();
  const [amount, setAmount] = useState<number>();
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');
  const [lang, setLang] = useState<Lang>('es');

  const dict = messages as Record<string, any>;
  const currentPack = dict[lang] ?? dict.es;
  const t = currentPack.CustomerPay ?? {};

  const selectedEmployee = data?.employees.find((e) => e.id === employee);

  useEffect(() => {
    api<Public>(`/public/locations/${params.publicId}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [params.publicId]);

  async function checkout() {
    if (!employee || !amount) return;
    try {
      const itemTemplate: string = t.stripeItemTitle ?? 'Propina para {name}';
      const productName = selectedEmployee
        ? itemTemplate.replace('{name}', selectedEmployee.name)
        : (t.leaveTipHere ?? 'Propina');

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
  if (!data) return <main className="p-8 text-center">Cargando…</main>;

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      {/* Selector de idioma para clientes locales y extranjeros */}
      <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label="Language">
        {LANGS.map((code) => {
          const isSelected = lang === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase transition ${
                isSelected
                  ? 'bg-orange-500 text-white'
                  : 'bg-black/10 text-current opacity-75 hover:opacity-100'
              }`}
            >
              {code}
            </button>
          );
        })}
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
              {`${t.payButton ?? 'Pagar'} ${amount.toFixed(2)} €`}
            </button>
          ) : null}
        </section>
      )}
    </main>
  );
}
