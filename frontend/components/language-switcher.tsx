'use client';

import { useEffect, useRef, useState } from 'react';

const languages = [
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
] as const;

export function LanguageSwitcher() {
  const [language, setLanguage] = useState<string>('es');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Obtener idioma guardado en cookie o localStorage
    const saved =
      document.cookie.match(/(?:^|; )propi-language=([^;]+)/)?.[1] ||
      localStorage.getItem('propi-language');

    if (saved && languages.some((item) => item.code === saved)) {
      setLanguage(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  useEffect(() => {
    // Cerrar al hacer clic fuera
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function changeLanguage(nextLanguage: string) {
    setLanguage(nextLanguage);
    setIsOpen(false);

    // Guardar preferencia
    document.cookie = `propi-language=${nextLanguage}; path=/; max-age=31536000; SameSite=Lax`;
    localStorage.setItem('propi-language', nextLanguage);
    document.documentElement.lang = nextLanguage;

    // Disparar evento para reaccionar en la página si fuera necesario
    window.dispatchEvent(new CustomEvent('propi-language-change', { detail: nextLanguage }));

    // Forzar recarga ligera o re-render si no usas i18n estructurado
    window.location.reload();
  }

  const currentLang = languages.find((item) => item.code === language) || languages[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Botón Flotante Principal */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-sm transition-all hover:border-orange-500/30 hover:bg-white/10"
        aria-expanded={isOpen}
        aria-label="Seleccionar idioma"
      >
        <svg
          className="h-3.5 w-3.5 text-orange-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9 9 0 100-18 9 9 0 000 18zM2.05 10.5h19.9M2.05 13.5h19.9M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z"
          />
        </svg>

        <span>{currentLang.name}</span>

        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
          {currentLang.label}
        </span>

        <svg
          className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 rounded-xl border border-white/10 bg-[#0c203c] p-1.5 shadow-2xl backdrop-blur-md z-50">
          {languages.map((item) => {
            const isSelected = item.code === language;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => changeLanguage(item.code)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-orange-500/20 text-orange-300 font-bold'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{item.name}</span>
                <span className={`text-[10px] font-semibold ${isSelected ? 'text-orange-400' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
