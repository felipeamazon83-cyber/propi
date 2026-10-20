'use client';

import React, { useState } from "react";
import { useTranslation } from "../../../context/LanguageContext";

export default function HelpPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      category: "1. Mi negocio",
      question: t('HelpCenter.q1') || "¿Cómo configuro mi restaurante?",
      answer: "En la sección '1. Datos del negocio' de Configuración, puedes indicar tu Nombre comercial, Razón social, País, Moneda y subir el logo de tu establecimiento. No olvides pulsar en 'Guardar datos' para aplicar los cambios."
    },
    {
      category: "1. Mi negocio",
      question: t('HelpCenter.q2') || "¿Cómo añado empleados?",
      answer: t('HelpCenter.a2') || "En '2. Equipo y cuenta de cobro', escribe el nombre en la casilla 'Nombre del empleado' y haz clic en 'Añadir'. Se creará una etiqueta con el botón 'Pendiente IBAN 🔗'. Al hacer clic sobre él, copiarás un enlace único para enviarle por WhatsApp o correo. El empleado abrirá este enlace una sola vez para guardar su cuenta bancaria de forma segura."
    },
    {
      category: "1. Mi negocio",
      question: t('HelpCenter.q3') || "¿Cómo conecto mi cuenta de cobro?",
      answer: "En el bloque '2. Equipo y cuenta de cobro', haz clic en el botón 'Gestionar Stripe'. Esto te redirigirá a la pasarela segura de Stripe para vincular la cuenta bancaria de tu restaurante."
    },
    {
      category: "2. Mesas y códigos",
      question: t('HelpCenter.q4') || "¿Cómo creo una mesa con QR?",
      answer: "En la sección '3. Mesa, QR y NFC', selecciona el tipo de ubicación, elige si el cliente escoge empleado o si es fijo, define el porcentaje y las propinas sugeridas, y pulsa 'Crear QR/NFC'. La mesa aparecerá abajo con la opción 'Tarjeta Mesa 🎨' para descargar o imprimir el diseño del QR."
    },
    {
      category: "2. Mesas y códigos",
      question: t('HelpCenter.q5') || "¿Cómo utilizo las etiquetas NFC?",
      answer: "Sigue los 3 pasos indicados en tu panel: 1. Compra pegatinas NFC neutras (NTAG213 o NTAG215). 2. Descarga la app gratuita 'NFC Tools' en tu móvil. 3. En la lista de mesas creadas, pulsa 'Copiar URL NFC', abre NFC Tools, ve a 'Escribir' → 'Añadir registro' → 'URL', pega el enlace y acerca tu teléfono a la pegatina para grabarla."
    },
    {
      category: "3. Reparto y tarifas",
      question: t('HelpCenter.q6') || "¿Cómo se reparten las propinas?",
      answer: "Las propinas se asignan al empleado correspondiente según la mesa o QR escaneado. En tu menú principal 'Propinas & Equipo' podrás consultar el desglose en la tabla 'Propinas por empleado' con sus totales recibidos, pagados y saldo pendiente."
    },
    {
      category: "3. Reparto y tarifas",
      question: t('HelpCenter.q7') || "¿Quién paga la tarifa del servicio?",
      answer: "Puedes elegirlo en el selector '¿Quién asume los costes del servicio?' en los Datos del negocio. Si seleccionas 'El Cliente', se le añadirá un recargo de 0,10 € + gastos de procesamiento al pagar para que el empleado reciba la propina íntegra. Si seleccionas 'El Restaurante', el cliente pagará únicamente la propina que elija y las tarifas de procesamiento y comisión se descontarán directamente del importe que recibe el empleado."
    },
    {
      category: "3. Reparto y tarifas",
      question: t('HelpCenter.q8') || "¿Cómo recibe el empleado su dinero?",
      answer: "Stripe gestiona el envío de fondos de forma directa a la cuenta bancaria que el empleado registró mediante su enlace personal. Propi recopila las cuentas con la máxima seguridad y nunca las almacena en sus servidores."
    },
    {
      category: "4. Gestión y solución de problemas",
      question: t('HelpCenter.q9') || "¿Puedo cambiar una mesa o un empleado?",
      answer: "Sí. Para eliminar un empleado o una mesa creada, pulsa sobre la 'X' o el botón 'Eliminar' junto a su nombre en la sección de Configuración."
    },
    {
      category: "4. Gestión y solución de problemas",
      question: t('HelpCenter.q10') || "¿Qué hago si un QR no funciona?",
      answer: "Haz clic en el botón 'Probar QR ↗' que aparece en la tarjeta de cada mesa dentro del panel para comprobar que la página de pago abre correctamente."
    },
    {
      category: "4. Gestión y solución de problemas",
      question: t('HelpCenter.q11') || "¿Qué hago si tengo un problema con Stripe?",
      answer: "Haz clic en 'Gestionar Stripe' en la sección de Equipo para revisar el estado de la conexión o comprobar si falta algún dato por verificar en Stripe."
    },
    {
      category: "4. Gestión y solución de problemas",
      question: t('HelpCenter.q12') || "¿Cómo contacto con soporte?",
      answer: "Si tienes dudas adicionales, puedes pulsar el botón 'Contactar con soporte' al final de este centro de ayuda para enviarnos un correo electrónico directamente."
    }
  ];

  const filteredFaqs = faqs.filter(
    (item) =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10 space-y-8 text-slate-100">
      {/* Cabecera */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 bg-orange-400/10 text-orange-400 rounded-full mb-1 border border-orange-400/20">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-orange-400 tracking-tight">
          {t('HelpCenter.title') || 'Centro de ayuda'}
        </h1>
        <p className="text-slate-400 max-w-lg mx-auto text-sm">
          {t('HelpCenter.subtitle') || 'Resuelve tus dudas sobre cómo configurar y utilizar Propi de forma rápida y sencilla.'}
        </p>

        {/* Buscador */}
        <div className="relative max-w-md mx-auto mt-6">
          <svg className="absolute left-3.5 top-3.5 text-slate-400 w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="¿Qué necesitas saber?"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[#0b2344] border border-white/10 rounded-xl shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-slate-100 placeholder-slate-400 text-sm"
          />
        </div>
      </div>

      {/* Lista de Acordeones */}
      <div className="space-y-4">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-12 bg-[#0b2344]/80 rounded-2xl border border-white/10 shadow-sm">
            <p className="text-slate-400 text-sm">No hemos encontrado resultados para tu búsqueda.</p>
          </div>
        ) : (
          filteredFaqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-[#0b2344] border border-white/10 rounded-2xl shadow-md overflow-hidden transition-all duration-200 hover:border-orange-400/30"
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between focus:outline-none"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                      {faq.category}
                    </span>
                    <h3 className="text-base font-medium text-slate-100">{faq.question}</h3>
                  </div>
                  <span className="ml-4 flex-shrink-0 text-orange-400 bg-orange-400/10 p-2 rounded-xl border border-orange-400/20">
                    {isOpen ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-2 text-slate-300 text-sm border-t border-white/10 bg-[#07182f]/60 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Tarjeta de Contacto */}
      <div className="bg-gradient-to-r from-[#0b2344] to-[#07182f] rounded-2xl p-8 text-center space-y-4 shadow-xl border border-white/10">
        <h3 className="text-xl font-semibold text-orange-400">
          {t('HelpCenter.noAnswer') || '¿No encuentras tu respuesta?'}
        </h3>
        <p className="text-slate-300 text-sm max-w-md mx-auto">
          {t('HelpCenter.contactSupport') || 'Contacta con el equipo de soporte y cuéntanos qué necesitas para ayudarte al instante.'}
        </p>
        <div>
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=soportepropi@gmail.com&su=Soporte%20Propi%20-%20Consulta%20desde%20el%20panel"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-400 text-slate-950 font-bold rounded-xl shadow hover:bg-orange-300 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contactar con soporte
          </a>
        </div>
      </div>
    </div>
  );
}
