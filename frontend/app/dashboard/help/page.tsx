"client"; // Si usas hooks como useState en Next.js App Router, recuerda marcarlo como cliente si es necesario
import React, { useState } from "react";
import { Search, ChevronDown, ChevronUp, HelpCircle, Mail } from "lucide-react";

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      category: "1. Mi negocio",
      question: "¿Cómo configuro mi restaurante?",
      answer: "Puedes configurar los datos básicos, el nombre comercial y la moneda directamente desde la sección de Configuración de tu negocio en el panel de control."
    },
    {
      category: "1. Mi negocio",
      question: "¿Cómo añado empleados?",
      answer: "Dirígete a la sección de Empleados en tu menú lateral, haz clic en 'Añadir empleado', completa su nombre y datos requeridos para generar su ficha."
    },
    {
      category: "1. Mi negocio",
      question: "¿Cómo conecto mi cuenta de cobro?",
      answer: "Para procesar las propinas, debes conectar tu cuenta empresarial a través de la integración oficial de Stripe disponible en la sección de configuración de pagos."
    },
    {
      category: "2. Mesas y códigos",
      question: "¿Cómo creo una mesa con QR?",
      answer: "Crea una nueva ubicación o mesa desde tu panel, genera el código QR asociado a su token público y descárgalo listo para imprimir."
    },
    {
      category: "2. Mesas y códigos",
      question: "¿Cómo utilizo NFC?",
      answer: "Vincula la URL pública de la ubicación o mesa generada en tu panel directamente a la etiqueta NFC para que los clientes puedan escanearla con el móvil."
    },
    {
      category: "3. Reparto y tarifas",
      question: "¿Cómo se reparten las propinas?",
      answer: "Las propinas se asignan al empleado correspondiente según la lectura del QR/NFC, o se distribuyen de acuerdo con las reglas configuradas en el sistema."
    },
    {
      category: "3. Reparto y tarifas",
      question: "¿Quién paga la tarifa del servicio?",
      answer: "Depende de tu configuración de negocio ('fee_payer'). Si está configurado para el cliente, el sistema calcula automáticamente un recargo en el checkout para cubrir tu comisión fija y las tasas de pasarela, asegurando que el empleado reciba su propina íntegra."
    },
    {
      category: "3. Reparto y tarifas",
      question: "¿Cómo recibe el empleado su dinero?",
      answer: "A través de transferencias automáticas mediante Stripe Connect. El dinero de las propinas procesadas se transfiere directamente a la cuenta conectada del empleado según el flujo establecido."
    },
    {
      category: "4. Gestión y solución de problemas",
      question: "¿Puedo cambiar una mesa o un empleado?",
      answer: "Sí, puedes editar la información, nombres y estados activos de tus empleados o ubicaciones en cualquier momento desde sus respectivas secciones de gestión."
    },
    {
      category: "4. Gestión y solución de problemas",
      question: "¿Qué hago si un QR no funciona?",
      answer: "Comprueba que la URL asociada sea correcta y que la ubicación se encuentre en estado 'activa' dentro de tu panel de administración."
    },
    {
      category: "4. Gestión y solución de problemas",
      question: "¿Qué hago si tengo un problema con Stripe?",
      answer: "Revisa el estado de la conexión de tu cuenta en la configuración de pagos y asegúrate de no tener datos o verificación pendientes en tu panel de Stripe."
    },
    {
      category: "4. Gestión y solución de problemas",
      question: "¿Cómo contacto con soporte?",
      answer: "Si necesitas asistencia adicional que no encuentres aquí, puedes escribirnos directamente a nuestro correo de soporte técnico."
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
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-50 text-indigo-600 rounded-full mb-1">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Centro de ayuda</h1>
        <p className="text-gray-600 max-w-lg mx-auto">
          Resuelve tus dudas sobre cómo configurar y utilizar Propi de forma rápida y sencilla.
        </p>

        <div className="relative max-w-md mx-auto mt-6">
          <Search className="absolute left-3.5 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="¿Qué necesitas saber?"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
            <p className="text-gray-500">No hemos encontrado resultados para tu búsqueda.</p>
          </div>
        ) : (
          filteredFaqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-white border border-gray-200/80 rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:border-gray-300"
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between focus:outline-none"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                      {faq.category}
                    </span>
                    <h3 className="text-base font-medium text-gray-900">{faq.question}</h3>
                  </div>
                  <span className="ml-4 flex-shrink-0 text-gray-400">
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-6 pb-4 pt-1 text-gray-600 text-sm border-t border-gray-100 bg-gray-50/50">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-8 text-white text-center space-y-4 shadow-lg">
        <h3 className="text-xl font-semibold">¿No encuentras tu respuesta?</h3>
        <p className="text-indigo-200 text-sm max-w-md mx-auto">
          Contacta con el equipo de soporte y cuéntanos qué necesitas para ayudarte al instante.
        </p>
        <div>
          <a
            href="mailto:soporte@propi.app"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-indigo-900 font-medium rounded-xl shadow hover:bg-indigo-50 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contactar con soporte
          </a>
        </div>
      </div>
    </div>
  );
}
