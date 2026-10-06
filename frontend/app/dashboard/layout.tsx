'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Propinas & Equipo', detail: 'Resumen', href: '/dashboard' },
    { label: 'Configuración', detail: 'Tu negocio', href: '/dashboard/settings' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#07182f] text-slate-100 md:flex-row">
      <aside className="w-full border-b border-white/10 bg-[#0b2344]/95 px-4 py-4 backdrop-blur md:min-h-screen md:w-64 md:border-b-0 md:border-r md:px-5 md:py-7">
        <div className="flex items-center justify-between md:block">
          <div className="flex items-center gap-2">
            <span className="brand text-2xl">PROPI<span className="text-orange-400">.</span></span>
            <span className="rounded-full bg-orange-400/15 px-2 py-1 text-xs font-bold text-orange-300">Business</span>
          </div>
          <span className="text-xs font-semibold text-slate-500 md:hidden">Panel de control</span>
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
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
