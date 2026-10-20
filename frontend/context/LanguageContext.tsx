'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

import es from '../messages/es.json';
import en from '../messages/en.json';
import fr from '../messages/fr.json';
import it from '../messages/it.json';
import de from '../messages/de.json';
import pt from '../messages/pt.json';

const dictionaries: Record<string, any> = { es, en, fr, it, de, pt };

interface LanguageContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState('es');

  useEffect(() => {
    const savedLocale = localStorage.getItem('propi_locale');
    if (savedLocale && dictionaries[savedLocale]) {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = (newLocale: string) => {
    if (dictionaries[newLocale]) {
      setLocaleState(newLocale);
      localStorage.setItem('propi_locale', newLocale);
    }
  };

  const t = (key: string) => {
    const keys = key.split('.');
    let value = dictionaries[locale];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    // Fallback al español si no encuentra la clave
    if (!value) {
      let fallbackValue = dictionaries['es'];
      for (const k of keys) {
        fallbackValue = fallbackValue?.[k];
      }
      return fallbackValue || key;
    }
    
    return value;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation debe ser usado dentro de un LanguageProvider');
  }
  return context;
}
