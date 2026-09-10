'use client';

import { useState } from 'react';
import { ChatAssistant } from './ChatAssistant';

export function FloatingChat({ pageMode = 'landing' }: { pageMode?: 'landing' | 'verificacion' }) {
  const [open, setOpen] = useState(false);

  const suggestions =
    pageMode === 'verificacion'
      ? [
          '¿Qué significa este certificado?',
          '¿Cómo puedo verificarlo?',
          '¿Qué pasa si está revocado?',
        ]
      : [
          '¿Cómo puedo verificar mi tarjeta?',
          '¿Cómo funciona la tecnología?',
          '¿Puedo verificar mi certificado sin registro?',
        ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-steel text-white shadow-lg shadow-slate-300/50 transition-all hover:scale-[1.02] hover:bg-steel-light"
        aria-label="Abrir asistente IA"
      >
        <span className="text-sm font-semibold">AI</span>
      </button>

      {open && (
        <div className="fixed bottom-40 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-sm border border-gray-200 bg-white shadow-2xl shadow-slate-300/40">
          <ChatAssistant
            certFound={pageMode === 'verificacion'}
            codigoCertificado=""
            pageMode={pageMode}
            defaultSuggestions={suggestions}
          />
        </div>
      )}
    </>
  );
}
