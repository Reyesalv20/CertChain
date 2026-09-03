'use client';

// Ruta pública: "/verificar"
// Cualquier persona (empleador, público general) puede verificar un certificado
// sin necesidad de iniciar sesión. Dos modos:
//   - "Por código": llama a GET /certificados/verificar?codigo=... en el backend.
//   - "Por hash (blockchain)": verifica on-chain (blockchain-service) y muestra
//     la metadata del certificado (mockeada por ahora).

import { useState, type KeyboardEvent } from 'react';
import { CheckIcon, ShieldIcon, XIcon } from '@/components/icons';
import { ChatAssistant } from '@/components/ChatAssistant';
import { api } from '@/lib/api';
import { verificarCertificado, type ResultadoVerificacionHash } from '@/lib/blockchain';
import type { Certificado, MetadataCertificado } from '@/lib/types';

type VerifyState = 'idle' | 'valid' | 'invalid' | 'error';
type HashState = 'idle' | 'valid' | 'revoked' | 'invalid' | 'error';
type Modo = 'codigo' | 'hash';

export default function VerificarPage() {
  const [modo, setModo] = useState<Modo>('codigo');
  const [query, setQuery] = useState('');
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [hashState, setHashState] = useState<HashState>('idle');
  const [searching, setSearching] = useState(false);
  const [certificado, setCertificado] = useState<Certificado | null>(null);
  const [resultadoHash, setResultadoHash] = useState<ResultadoVerificacionHash | null>(null);
  const [metadata, setMetadata] = useState<MetadataCertificado | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleVerify() {
    const valor = query.trim();
    if (!valor) return;
    setSearching(true);
    setErrorMsg('');
    try {
      if (modo === 'codigo') {
        const resultado = await api.verificarCertificado(valor);
        if (resultado.valido && resultado.certificado) {
          setCertificado(resultado.certificado);
          setVerifyState('valid');
        } else {
          setCertificado(null);
          setVerifyState('invalid');
        }
      } else {
        const onChain = await verificarCertificado(valor);
        setResultadoHash(onChain);
        if (!onChain.exists) {
          setMetadata(null);
          setHashState('invalid');
        } else {
          // Metadata desde el backend/Supabase (mockeada por ahora).
          setMetadata(await api.obtenerMetadataPorHash(valor).catch(() => null));
          setHashState(onChain.isRevoked ? 'revoked' : 'valid');
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo verificar el certificado.');
      if (modo === 'codigo') setVerifyState('error');
      else setHashState('error');
    } finally {
      setSearching(false);
    }
  }

  function reset() {
    setVerifyState('idle');
    setHashState('idle');
    setQuery('');
    setCertificado(null);
    setResultadoHash(null);
    setMetadata(null);
    setErrorMsg('');
  }

  function cambiarModo(nuevo: Modo) {
    if (nuevo === modo) return;
    setModo(nuevo);
    reset();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleVerify();
  }

  const fechaOnChain = resultadoHash && Number(resultadoHash.issueTimestamp) > 0
    ? new Date(Number(resultadoHash.issueTimestamp) * 1000).toLocaleString()
    : '—';

  const camposHash: { label: string; value: string }[] = [
    { label: 'Emisor (wallet)', value: resultadoHash?.issuer ?? '—' },
    { label: 'Fecha de emisión (blockchain)', value: fechaOnChain },
    ...(metadata
      ? [
          { label: 'Institución', value: metadata.institucion },
          { label: 'Titular', value: metadata.nombreEstudiante },
          { label: 'Carrera', value: metadata.carrera },
          { label: 'Código', value: metadata.codigo },
          { label: 'Fecha de emisión (registro)', value: metadata.fechaEmision },
        ]
      : []),
  ];

  const botonModo = (m: Modo, label: string) => (
    <button
      onClick={() => cambiarModo(m)}
      className={`px-4 py-2 text-sm font-semibold rounded-sm border transition-colors bg-transparent ${
        modo === m ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 hover:bg-gray-50'
      }`}
      style={modo === m ? { backgroundColor: '#1F4E5F' } : undefined}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <p className="text-xs font-mono uppercase tracking-widest mb-3 text-steel">
          Verificación abierta · Sin registro requerido
        </p>
        <h1 className="font-display text-navy text-4xl leading-tight mb-4">¿Es auténtico este certificado?</h1>
        <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
          {modo === 'codigo'
            ? 'Ingresa el código impreso en el certificado o escanea el chip RFID de la credencial física.'
            : 'Ingresa el hash del certificado para verificarlo directamente en la blockchain.'}
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-6">
        {botonModo('codigo', 'Por código')}
        {botonModo('hash', 'Por hash (blockchain)')}
      </div>

      <div className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              const value = e.target.value;
              if (verifyState !== 'idle' || hashState !== 'idle') reset();
              setQuery(value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={modo === 'codigo' ? 'Ej: UAX-2024-0847-MENG' : '0x + 64 caracteres hex'}
            className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-sm outline-none font-mono tracking-wide focus:border-steel"
          />
          <button
            onClick={handleVerify}
            disabled={searching}
            className="px-5 py-3 text-sm font-semibold text-white rounded-sm transition-all shrink-0 border-none"
            style={{ backgroundColor: searching ? '#4a8fa8' : '#1F4E5F' }}
          >
            {searching ? 'Buscando...' : modo === 'codigo' ? 'Verificar' : 'Verificar en blockchain'}
          </button>
        </div>
        {modo === 'codigo' && (
          <>
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
          </>
        )}
      </div>

      {(verifyState === 'error' || hashState === 'error') && (
        <p className="text-center text-xs text-red-600 mb-6">{errorMsg}</p>
      )}

      {/* ── Modo código ─────────────────────────────────────── */}
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

      {/* ── Modo hash (blockchain) ──────────────────────────── */}
      {hashState === 'valid' && resultadoHash && (
        <div className="rounded-sm border-2 overflow-hidden" style={{ borderColor: '#1a7a4a' }}>
          <div className="flex items-center gap-3 px-5 py-4 bg-[#f0faf4]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-valid text-white">
              <CheckIcon size={16} />
            </div>
            <div>
              <p className="font-semibold text-green-800 text-sm">Certificado auténtico</p>
              <p className="text-green-700 text-xs">Registrado en blockchain · No revocado</p>
            </div>
            <div className="ml-auto">
              <ShieldIcon size={22} color="#1a7a4a" />
            </div>
          </div>
          <div className="bg-white px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-green-100">
            {camposHash.map((f) => (
              <div key={f.label}>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-0.5">{f.label}</p>
                <p className="text-sm text-gray-800 font-medium break-all">{f.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 border-t border-green-100 px-5 py-3">
            <p className="text-xs text-gray-400 font-mono break-all">Hash: {query.trim()}</p>
          </div>
        </div>
      )}

      {hashState === 'revoked' && resultadoHash && (
        <div className="rounded-sm border-2 overflow-hidden" style={{ borderColor: '#c0392b' }}>
          <div className="flex items-center gap-3 px-5 py-4 bg-[#fdf4f3]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-invalid text-white">
              <XIcon size={16} />
            </div>
            <div>
              <p className="font-semibold text-red-800 text-sm">Certificado revocado</p>
              <p className="text-red-700 text-xs">Este certificado existe en la blockchain pero fue revocado.</p>
            </div>
          </div>
          <div className="bg-white px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-red-100">
            {camposHash.map((f) => (
              <div key={f.label}>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-0.5">{f.label}</p>
                <p className="text-sm text-gray-800 font-medium break-all">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hashState === 'invalid' && (
        <div className="rounded-sm border-2 overflow-hidden" style={{ borderColor: '#c0392b' }}>
          <div className="flex items-center gap-3 px-5 py-4 bg-[#fdf4f3]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-invalid text-white">
              <XIcon size={16} />
            </div>
            <div>
              <p className="font-semibold text-red-800 text-sm">No encontrado en la blockchain</p>
              <p className="text-red-700 text-xs">No existe ningún certificado registrado con ese hash.</p>
            </div>
          </div>
          <div className="bg-white px-5 py-4 border-t border-red-100">
            <p className="text-xs text-gray-500 leading-relaxed">
              Verificá que el hash esté escrito correctamente. Los certificados auténticos quedan registrados
              de forma inmutable en la blockchain.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
