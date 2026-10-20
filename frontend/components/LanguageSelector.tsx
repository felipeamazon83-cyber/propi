'use client';

import { useTranslation } from '../context/LanguageContext';

const languages = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
];

export function LanguageSelector() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="relative inline-block">
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        className="appearance-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 pr-8 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none cursor-pointer"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-[#0b2344] text-white">
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
        ▼
      </div>
    </div>
  );
}
