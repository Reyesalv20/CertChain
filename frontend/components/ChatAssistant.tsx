'use client';

import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { MensajeChat } from '@/lib/types';
import { SendIcon } from './icons';

// Asistente de preguntas sobre un certificado ya verificado.
// Llama a POST /chat en el backend, que a su vez debe reenviar la pregunta
// a llm-service (RAG). Ver frontend/API_CONTRACT.md.
export function ChatAssistant({ certFound, codigoCertificado }: { certFound: boolean; codigoCertificado: string }) {
  const [messages, setMessages] = useState<MensajeChat[]>([
    {
      rol: 'bot',
      texto: certFound
        ? 'Hola, soy el asistente de CertChain. Puedo responder tus preguntas sobre este certificado verificado. ¿En qué te puedo ayudar?'
        : 'No encontré un certificado registrado. Verifica que el código sea correcto o prueba escaneando la tarjeta física.',
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  async function send() {
    const text = input.trim();
    if (!text || typing) return;
    setMessages((m) => [...m, { rol: 'usuario', texto: text }]);
    setInput('');
    setTyping(true);
    try {
      const { respuesta } = await api.preguntarAsistente(text, codigoCertificado);
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

      {certFound && (
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="¿Cuándo se emitió? ¿Quién es el titular?..."
            className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-sm outline-none"
          />
          <button
            onClick={send}
            className="px-3 py-2 rounded-sm text-white flex items-center justify-center bg-steel border-none cursor-pointer"
            style={{ minWidth: 40 }}
          >
            <SendIcon size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
