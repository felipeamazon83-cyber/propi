import { supabase } from './supabase';

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const API = (configuredApiUrl || 'https://propi-dct2.onrender.com/api')
  .replace(/^(?!https?:\/\/)/i, 'https://')
  .replace(/\/+$/, '');

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

  // Si la respuesta es HTTP 204 (No Content) o no tiene cuerpo, retornamos un objeto vacío
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
