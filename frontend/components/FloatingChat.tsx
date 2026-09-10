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
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {open && (
          <div className="w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-sm border border-gray-200 bg-white shadow-2xl shadow-slate-300/40 transition-all duration-300 ease-out animate-[fadeIn_0.2s_ease-out]">
            <ChatAssistant
              certFound={pageMode === 'verificacion'}
              codigoCertificado=""
              pageMode={pageMode}
              defaultSuggestions={suggestions}
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-center h-11 w-11 rounded-full bg-steel text-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5 transition-all hover:scale-[1.02] hover:bg-steel-light"
          aria-label="Abrir asistente IA"
        >
          <span className="text-[11px] font-semibold">AI</span>
        </button>
      </div>
    </>
  );
}
