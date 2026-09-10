'use client';

import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { MensajeChat } from '@/lib/types';
import { SendIcon } from './icons';

// Asistente de preguntas sobre un certificado ya verificado.
// Llama a POST /chat en el backend, que a su vez debe reenviar la pregunta
// a llm-service con el contexto ya resuelto.
export function ChatAssistant({
  certFound,
  codigoCertificado,
  pageMode = 'verificacion',
  defaultSuggestions = [],
}: {
  certFound: boolean;
  codigoCertificado: string;
  pageMode?: 'landing' | 'verificacion';
  defaultSuggestions?: string[];
}) {
  const [messages, setMessages] = useState<MensajeChat[]>([
    {
      rol: 'bot',
      texto:
        pageMode === 'landing'
          ? 'Hola, soy el asistente de CertChain. Puedo orientarte sobre cómo verificar un certificado, usar tu tarjeta RFID o entender la tecnología blockchain.'
          : certFound
            ? 'Hola, soy el asistente de CertChain. Puedo responder tus preguntas sobre este certificado verificado. ¿En qué te puedo ayudar?'
            : 'No encontré un certificado registrado. Verifica que el código sea correcto o prueba escaneando la tarjeta física.',
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(defaultSuggestions.length > 0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowSuggestions(defaultSuggestions.length > 0);
  }, [defaultSuggestions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  async function send(texto?: string) {
    const text = (texto ?? input).trim();
    if (!text || typing) return;
    setMessages((m) => [...m, { rol: 'usuario', texto: text }]);
    setInput('');
    setTyping(true);
    try {
      const contexto = pageMode === 'landing'
        ? {
            modo: null,
            query: null,
            estado: 'idle',
            certificado: null,
          }
        : certFound
          ? {
              modo: 'codigo',
              query: codigoCertificado,
              estado: 'valid',
              certificado: {
                codigo: codigoCertificado,
              },
            }
          : {
              modo: 'codigo',
              query: codigoCertificado || null,
              estado: 'invalid',
              certificado: null,
            };

      const { respuesta } = await api.preguntarAsistente(text, codigoCertificado, contexto, pageMode);
      setMessages((m) => [...m, { rol: 'bot', texto: respuesta }]);
    } catch (err) {
      const mensaje =
        err instanceof ApiError ? err.message : 'El asistente no está disponible en este momento.';
      setMessages((m) => [...m, { rol: 'bot', texto: mensaje }]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2.5 bg-[#f8fafb]">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Asistente IA · CertChain</span>
      </div>

      <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto" style={{ minHeight: 180, maxHeight: 280 }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs px-4 py-2.5 rounded-sm text-sm leading-relaxed ${
                m.rol === 'usuario' ? 'bg-navy text-white' : 'bg-[#f1f5f8] text-[#2a3a4a]'
              }`}
            >
              {m.texto}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 rounded-sm text-sm bg-[#f1f5f8]">
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {defaultSuggestions.length > 0 && (
        <>
          {showSuggestions ? (
            <div className="px-4 py-3 border-t border-gray-100">
              <div className="mb-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowSuggestions(false)}
                  aria-label="Ocultar sugerencias"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-xs text-gray-500 hover:bg-gray-100"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {defaultSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="px-2.5 py-1.5 text-[11px] rounded-full border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowSuggestions(true)}
                className="text-[11px] font-medium text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline"
              >
                Ver sugerencias
              </button>
            </div>
          )}
        </>
      )}

      <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={
            pageMode === 'landing'
              ? 'Pregúntale al asistente sobre verificación...'
              : '¿Cuándo se emitió? ¿Quién es el titular?...'
          }
          className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-sm outline-none"
        />
        <button
          onClick={() => send()}
          className="px-3 py-2 rounded-sm text-white flex items-center justify-center bg-steel border-none cursor-pointer"
          style={{ minWidth: 40 }}
        >
          <SendIcon size={14} />
        </button>
      </div>
    </div>
  );
}
