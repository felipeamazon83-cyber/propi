import { supabase } from './supabase';
const API = process.env.NEXT_PUBLIC_API_URL;

export async function api<T>(path: string, options: RequestInit = {}, authenticated = false): Promise<T> {
  if (!API) throw new Error('Falta configurar NEXT_PUBLIC_API_URL en Vercel.');
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');
    headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  const response = await fetch(`${API}${path}`, { ...options, headers, cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || 'No se pudo completar la solicitud.');
  }
  return response.json() as Promise<T>;
}
