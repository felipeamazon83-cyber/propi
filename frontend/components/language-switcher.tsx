'use client';

import { useEffect, useState } from 'react';

const translations: Record<string, Record<string, string>> = {
  en: { 'Precios': 'Pricing', 'Iniciar sesión': 'Log in', 'Crear mi cuenta': 'Create my account', 'Descubrir Propi': 'Discover Propi', 'Cómo funciona': 'How it works', 'Simple para todos.': 'Simple for everyone.', 'Hablemos': 'Let’s talk', '¿Tienes alguna pregunta?': 'Have a question?', 'Enviar mensaje': 'Send message', 'Hablar por WhatsApp': 'Chat on WhatsApp', 'Precios claros': 'Clear pricing', 'Todo lo que necesitas para recibir más gracias.': 'Everything you need to receive more thanks.', 'AGRADECER TAMBIÉN ES PARTE DEL SERVICIO': 'THANKS ARE PART OF THE SERVICE' },
  fr: { 'Precios': 'Tarifs', 'Iniciar sesión': 'Se connecter', 'Crear mi cuenta': 'Créer mon compte', 'Descubrir Propi': 'Découvrir Propi', 'Cómo funciona': 'Comment ça marche', 'Simple para todos.': 'Simple pour tous.', 'Hablemos': 'Parlons-nous', '¿Tienes alguna pregunta?': 'Une question ?', 'Enviar mensaje': 'Envoyer le message', 'Hablar por WhatsApp': 'Écrire sur WhatsApp', 'Precios claros': 'Tarifs transparents' },
  de: { 'Precios': 'Preise', 'Iniciar sesión': 'Anmelden', 'Crear mi cuenta': 'Konto erstellen', 'Descubrir Propi': 'Propi entdecken', 'Cómo funciona': 'So funktioniert es', 'Simple para todos.': 'Einfach für alle.', 'Hablemos': 'Sprechen wir', '¿Tienes alguna pregunta?': 'Hast du eine Frage?', 'Enviar mensaje': 'Nachricht senden', 'Hablar por WhatsApp': 'Per WhatsApp schreiben', 'Precios claros': 'Klare Preise' },
};

function translatePage(language: string) {
  const dictionary = translations[language];
  if (!dictionary) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  nodes.forEach((textNode) => {
    const value = textNode.nodeValue?.trim();
    if (value && dictionary[value]) textNode.nodeValue = textNode.nodeValue?.replace(value, dictionary[value]) ?? textNode.nodeValue;
  });
}

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
    if (saved && languages.some((item) => item.code === saved)) {
      setLanguage(saved);
      document.documentElement.lang = saved;
      window.setTimeout(() => translatePage(saved), 0);
    }
  }, []);

  function changeLanguage(nextLanguage: string) {
    setLanguage(nextLanguage);
    document.cookie = `propi-language=${nextLanguage}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = nextLanguage;
    window.dispatchEvent(new CustomEvent('propi-language-change', { detail: nextLanguage }));
    window.setTimeout(() => translatePage(nextLanguage), 0);
  }

  return (
    <label className="language-switcher">
      <span className="sr-only">Seleccionar idioma</span>
      <span aria-hidden="true">文 / A</span>
      <select value={language} onChange={(event) => changeLanguage(event.target.value)} aria-label="Seleccionar idioma">
        {languages.map((item) => <option value={item.code} key={item.code}>{item.label} · {item.name}</option>)}
      </select>
    </label>
  );
}
