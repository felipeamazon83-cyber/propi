'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: '📊 Propinas & Equipo', href: '/dashboard' },
    { label: '⚙️ Configuración Negocio', href: '/dashboard/settings' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar Lateral */}
      <aside className="w-64 border-r border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-green-600">Propi</span>
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
            Business
          </span>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-700 font-bold'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
