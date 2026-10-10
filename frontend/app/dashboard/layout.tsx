'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Propinas & Equipo', detail: 'Resumen', href: '/dashboard' },
    { label: 'Configuración', detail: 'Tu negocio', href: '/dashboard/settings' },
  ];

  function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#07182f] text-slate-100 md:flex-row">
      <aside className="flex w-full flex-col justify-between border-b border-white/10 bg-[#0b2344]/95 px-4 py-4 backdrop-blur md:min-h-screen md:w-64 md:border-b-0 md:border-r md:px-5 md:py-7">
        <div>
          <div className="flex items-center justify-between md:block">
            <div className="flex items-center gap-2">
              <Link href="/" className="brand-logo" aria-label="Propi">
                <img src="/propi-logo.png" alt="Propi" className="h-8 w-auto object-contain" />
              </Link>
              <span className="rounded-full bg-orange-400/15 px-2 py-1 text-xs font-bold text-orange-300">
                Business
              </span>
            </div>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto md:mt-10 md:flex-col">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`min-w-[155px] rounded-xl border px-3 py-3 transition-colors md:min-w-0 ${
                    isActive
                      ? 'border-orange-400/30 bg-orange-400/10 text-orange-200'
                      : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-100'
                  }`}
                >
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{item.detail}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Botón Cerrar sesión ubicado abajo de forma limpia */}
        <div className="mt-6 border-t border-white/10 pt-4 md:mt-auto">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
