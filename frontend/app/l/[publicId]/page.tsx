'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

type Public = {
  business_name: string;
  logo_url?: string;
  location_name: string;
  employees: { id: string; name: string; photo_url?: string }[];
  suggested_amounts: number[];
  minimum_amount: number;
  maximum_amount: number;
};

export default function TipPage({ params }: { params: { publicId: string } }) {
  const [data, setData] = useState<Public>();
  const [employee, setEmployee] = useState<string>();
  const [amount, setAmount] = useState<number>();
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<Public>(`/public/locations/${params.publicId}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [params.publicId]);

  async function checkout() {
    if (!employee || !amount) return;
    try {
      const r = await api<{ checkout_url: string }>('/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
          public_token: params.publicId,
          employee_id: employee,
          amount,
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
    <main className="mx-auto min-h-screen max-w-md px-5 py-10">
      <p className="text-center text-sm text-gray-500">{data.location_name}</p>
      <h1 className="mt-2 text-center text-3xl font-black">{data.business_name}</h1>

      {!employee ? (
        <section className="mt-10">
          <h2 className="text-2xl font-bold">¿Quién te atendió?</h2>
          <div className="mt-5 space-y-3">
            {data.employees.map((e) => (
              <button
                onClick={() => setEmployee(e.id)}
                className="card flex w-full items-center gap-3.5 text-left text-lg font-bold transition-all hover:border-orange-500/50"
                key={e.id}
              >
                {/* Contenedor del Corazón Naranja */}
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
        <section className="mt-10">
          <button className="text-sm underline" onClick={() => setEmployee(undefined)}>
            ← Cambiar persona
          </button>
          <h2 className="mt-4 text-2xl font-bold">Gracias por tu visita ❤️</h2>
          <p className="mt-1 text-gray-600">¿Quieres dejar una propina?</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {data.suggested_amounts.map((v) => (
              <button
                onClick={() => setAmount(v)}
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
            placeholder="Otro importe (€)"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setAmount(Number(e.target.value));
            }}
          />

          {amount ? (
            <button onClick={checkout} className="btn btn-primary mt-6 w-full">
              Pagar {amount.toFixed(2)} €
            </button>
          ) : null}
        </section>
      )}
    </main>
  );
}
