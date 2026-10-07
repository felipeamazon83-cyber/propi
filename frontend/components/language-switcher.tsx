'use client';

import { useEffect, useState } from 'react';

const languages = [
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
] as const;

export function LanguageSwitcher() {
  const [language, setLanguage] = useState('es');

  useEffect(() => {
    const saved = document.cookie.match(/(?:^|; )propi-language=([^;]+)/)?.[1];
    if (saved && languages.some((item) => item.code === saved)) setLanguage(saved);
  }, []);

  function changeLanguage(nextLanguage: string) {
    setLanguage(nextLanguage);
    document.cookie = `propi-language=${nextLanguage}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = nextLanguage;
  }

  return (
    <label className="language-switcher">
      <span className="sr-only">Seleccionar idioma</span>
      <span aria-hidden="true">文</span>
      <select value={language} onChange={(event) => changeLanguage(event.target.value)} aria-label="Seleccionar idioma">
        {languages.map((item) => <option value={item.code} key={item.code}>{item.label} · {item.name}</option>)}
      </select>
    </label>
  );
}
