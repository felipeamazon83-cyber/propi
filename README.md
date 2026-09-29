# TIP — Propinas digitales con QR y NFC

MVP SaaS de €0/mes: un negocio crea ubicaciones QR/NFC y el cliente paga una propina por Stripe Checkout. Propi aplica una tarifa fija por transacción al cliente; el importe de propina seleccionado se transfiere íntegro a la cuenta conectada. No procesa ni almacena tarjetas: Stripe aloja el pago.

## Arquitectura

- `frontend/`: Next.js App Router, Tailwind y Supabase Auth. Despliegue en Vercel.
- `backend/`: FastAPI, SQLAlchemy y Stripe. Despliegue en Render con `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- `supabase/migrations/`: PostgreSQL, índices y políticas RLS. La API de backend usa la clave de servicio, por lo que valida el bearer token y aplica propiedad antes de mutar datos.

## Desarrollo local

1. Copia `.env.example` a `frontend/.env.local` y `backend/.env`; reparte las variables por aplicación.
2. En Supabase, ejecuta `supabase/migrations/202609290001_initial.sql` y habilita email/password en Auth.
3. `cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/uvicorn app.main:app --reload`.
4. `cd frontend && npm install && npm run dev`.

## Stripe

Configura `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PROPI_FIXED_FEE_CENTS` (20 por defecto) y `PROPI_FEE_PERCENT` (0 por defecto) en Render; nunca los expongas al frontend. Reenvía webhooks localmente con `stripe listen --forward-to localhost:8000/api/webhooks/stripe`. El endpoint verifica la firma y usa el ID de Checkout como clave única para no duplicar propinas.

Stripe Checkout muestra tarjeta y, cuando Stripe/browser lo permite, Apple Pay y Google Pay. Configura los dominios de pago en Stripe antes de producción.

## QR y NFC

Cada `POST /api/businesses/{id}/locations` genera un token aleatorio de 24 bytes y devuelve la URL pública `/r/{token}`. Esa misma URL puede codificarse en un QR o escribirse en una etiqueta NFC. La ruta pública solo devuelve nombre de negocio, ubicación, empleados activos y límites/opciones de propina.

## Despliegue

Importa `frontend` como proyecto Vercel y `backend` como Web Service Render. Define las variables de `.env.example` en cada plataforma, restringe `CORS_ORIGINS` al dominio Vercel y aplica la migración antes de desplegar.
