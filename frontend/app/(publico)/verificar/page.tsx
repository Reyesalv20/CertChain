'use client';

// Ruta pública: "/verificar"
// Cualquier persona (empleador, público general) puede verificar un certificado
// por su código, sin necesidad de iniciar sesión.
// Llama a GET /certificados/verificar?codigo=... en el backend.

import { useState, type KeyboardEvent } from 'react';
import { CheckIcon, ShieldIcon, XIcon } from '@/components/icons';
import { ChatAssistant } from '@/components/ChatAssistant';
import { api, ApiError } from '@/lib/api';
import type { Certificado } from '@/lib/types';

type VerifyState = 'idle' | 'valid' | 'invalid' | 'error';

export default function VerificarPage() {
  const [query, setQuery] = useState('');
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [searching, setSearching] = useState(false);
  const [certificado, setCertificado] = useState<Certificado | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleVerify() {
    const codigo = query.trim();
    if (!codigo) return;
    setSearching(true);
    try {
      const resultado = await api.verificarCertificado(codigo);
      if (resultado.valido && resultado.certificado) {
        setCertificado(resultado.certificado);
        setVerifyState('valid');
      } else {
        setCertificado(null);
        setVerifyState('invalid');
      }
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'No se pudo verificar el certificado.');
      setVerifyState('error');
    } finally {
      setSearching(false);
    }
  }

  function reset() {
    setVerifyState('idle');
    setQuery('');
    setCertificado(null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleVerify();
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <p className="text-xs font-mono uppercase tracking-widest mb-3 text-steel">
          Verificación abierta · Sin registro requerido
        </p>
        <h1 className="font-display text-navy text-4xl leading-tight mb-4">¿Es auténtico este certificado?</h1>
        <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
          Ingresa el código impreso en el certificado o escanea el chip RFID de la credencial física.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              const value = e.target.value;
              if (verifyState !== 'idle') reset();
              setQuery(value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ej: UAX-2024-0847-MENG"
            className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-sm outline-none font-mono tracking-wide focus:border-steel"
          />
          <button
            onClick={handleVerify}
            disabled={searching}
            className="px-5 py-3 text-sm font-semibold text-white rounded-sm transition-all shrink-0 border-none"
            style={{ backgroundColor: searching ? '#4a8fa8' : '#1F4E5F' }}
          >
            {searching ? 'Buscando...' : 'Verificar'}
          </button>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">o</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>
        <button
          className="w-full mt-3 py-2.5 text-sm font-medium border border-gray-200 rounded-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 bg-transparent"
          disabled
          title="Requiere lector RFID/QR conectado (integración pendiente con hardware)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Escanear tarjeta RFID / QR
        </button>
      </div>

      {verifyState === 'error' && (
        <p className="text-center text-xs text-red-600 mb-6">{errorMsg}</p>
      )}

      {verifyState === 'valid' && certificado && (
        <div className="flex flex-col gap-5">
          <div className="rounded-sm border-2 overflow-hidden" style={{ borderColor: '#1a7a4a' }}>
            <div className="flex items-center gap-3 px-5 py-4 bg-[#f0faf4]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-valid text-white">
                <CheckIcon size={16} />
              </div>
              <div>
                <p className="font-semibold text-green-800 text-sm">Certificado auténtico</p>
                <p className="text-green-700 text-xs">Verificado en blockchain · No alterado</p>
              </div>
              <div className="ml-auto">
                <ShieldIcon size={22} color="#1a7a4a" />
              </div>
            </div>
            <div className="bg-white px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-green-100">
              {[
                { label: 'Institución', value: certificado.institucion ?? '—' },
                { label: 'Titular', value: certificado.nombreEstudiante },
                { label: 'Carrera', value: certificado.carrera },
                { label: 'Fecha de emisión', value: certificado.fechaEmision },
                { label: 'Código', value: certificado.codigo },
                { label: 'Estado RFID', value: certificado.rfid ? 'Vinculado · Activo' : 'Sin vincular' },
              ].map((f) => (
                <div key={f.label}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-0.5">{f.label}</p>
                  <p className="text-sm text-gray-800 font-medium">{f.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 border-t border-green-100 px-5 py-3">
              <p className="text-xs text-gray-400 font-mono break-all">Hash: {certificado.hash}</p>
            </div>
          </div>
          <ChatAssistant certFound={true} codigoCertificado={certificado.codigo} />
        </div>
      )}

      {verifyState === 'invalid' && (
        <div className="flex flex-col gap-5">
          <div className="rounded-sm border-2 overflow-hidden" style={{ borderColor: '#c0392b' }}>
            <div className="flex items-center gap-3 px-5 py-4 bg-[#fdf4f3]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-invalid text-white">
                <XIcon size={16} />
              </div>
              <div>
                <p className="font-semibold text-red-800 text-sm">Certificado no encontrado</p>
                <p className="text-red-700 text-xs">No se encontró ningún certificado con ese código en el registro.</p>
              </div>
            </div>
            <div className="bg-white px-5 py-4 border-t border-red-100">
              <p className="text-xs text-gray-500 leading-relaxed">
                Verifica que el código esté escrito correctamente. Si crees que hay un error, contacta directamente a
                la institución emisora. Este sistema no puede ser manipulado — todos los certificados auténticos
                están registrados inmutablemente.
              </p>
            </div>
          </div>
          <ChatAssistant certFound={false} codigoCertificado={query.trim()} />
        </div>
      )}
    </div>
  );
}
