'use client';

// Ruta pública: "/verificar"
// Verifica un certificado por: código, hash (blockchain) o tarjeta RFID.
//   /verificar?card_id=04A224B2  → resuelve la tarjeta y verifica sus certificados on-chain.
//
// Modos:
//   - "Por código": GET /certificados/verificar?codigo=...
//   - "Por hash": on-chain (blockchain-service) + metadata.
//   - "Por tarjeta": GET /certificados/por-rfid/:uid → verifica cada cert on-chain.

import { useEffect, useState, type KeyboardEvent } from 'react';
import { CheckIcon, ShieldIcon, XIcon } from '@/components/icons';
import { ChatAssistant } from '@/components/ChatAssistant';
import { api } from '@/lib/api';
import { verificarCertificado, type ResultadoVerificacionHash } from '@/lib/blockchain';
import type { Certificado, CertificadoTarjeta, MetadataCertificado } from '@/lib/types';

type VerifyState = 'idle' | 'valid' | 'invalid' | 'error';
type HashState = 'idle' | 'valid' | 'revoked' | 'invalid' | 'error';
type Modo = 'codigo' | 'hash' | 'tarjeta';

interface CertTarjetaVerificado {
  cert: CertificadoTarjeta;
  onChain: ResultadoVerificacionHash | null;
  estado: 'valid' | 'revoked' | 'invalid' | 'error';
}

export default function VerificarPage() {
  const [modo, setModo] = useState<Modo>('codigo');
  const [query, setQuery] = useState('');
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [hashState, setHashState] = useState<HashState>('idle');
  const [searching, setSearching] = useState(false);
  const [certificado, setCertificado] = useState<Certificado | null>(null);
  const [resultadoHash, setResultadoHash] = useState<ResultadoVerificacionHash | null>(null);
  const [metadata, setMetadata] = useState<MetadataCertificado | null>(null);
  const [tarjetaCerts, setTarjetaCerts] = useState<CertTarjetaVerificado[]>([]);
  const [tarjetaUid, setTarjetaUid] = useState('');
  const [tarjetaError, setTarjetaError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Si entran con /verificar?card_id=..., auto-verificar la tarjeta.
  useEffect(() => {
    const cardId = new URLSearchParams(window.location.search).get('card_id');
    if (cardId) {
      setModo('tarjeta');
      setQuery(cardId);
      handleVerificarTarjeta(cardId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verificarCertTarjeta(c: CertificadoTarjeta): Promise<CertTarjetaVerificado> {
    try {
      const onChain = await verificarCertificado(c.hash);
      if (!onChain.exists) return { cert: c, onChain, estado: 'invalid' };
      return { cert: c, onChain, estado: onChain.isRevoked ? 'revoked' : 'valid' };
    } catch {
      return { cert: c, onChain: null, estado: 'error' };
    }
  }

  async function handleVerificarTarjeta(uid: string) {
    if (!uid.trim()) return;
    setSearching(true);
    setTarjetaError('');
    setErrorMsg('');
    try {
      const resultado = await api.obtenerPorTarjeta(uid.trim());
      setTarjetaUid(resultado.uidRfid);
      if (resultado.certificados.length === 0) {
        setTarjetaCerts([]);
      } else {
        const verificados = await Promise.all(resultado.certificados.map(verificarCertTarjeta));
        setTarjetaCerts(verificados);
      }
    } catch (err) {
      setTarjetaCerts([]);
      setTarjetaError(err instanceof Error ? err.message : 'No se pudo leer la tarjeta.');
    } finally {
      setSearching(false);
    }
  }

  async function handleVerify() {
    const valor = query.trim();
    if (!valor) return;
    setSearching(true);
    setErrorMsg('');
    setTarjetaError('');
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
      } else if (modo === 'hash') {
        const onChain = await verificarCertificado(valor);
        setResultadoHash(onChain);
        if (!onChain.exists) {
          setMetadata(null);
          setHashState('invalid');
        } else {
          setMetadata(await api.obtenerMetadataPorHash(valor).catch(() => null));
          setHashState(onChain.isRevoked ? 'revoked' : 'valid');
        }
      } else {
        await handleVerificarTarjeta(valor);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo verificar el certificado.');
      if (modo === 'codigo') setVerifyState('error');
      else if (modo === 'hash') setHashState('error');
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
    setTarjetaCerts([]);
    setTarjetaUid('');
    setTarjetaError('');
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

  const descripcion =
    modo === 'codigo'
      ? 'Ingresa el código impreso en el certificado.'
      : modo === 'hash'
        ? 'Ingresa el hash del certificado para verificarlo en la blockchain.'
        : 'Ingresa el UID de la tarjeta RFID o escaneala desde el prototipo.';

  const placeholder =
    modo === 'codigo' ? 'Ej: UAX-2024-0847-MENG' : modo === 'hash' ? '0x + 64 hex' : 'Ej: 04A224B2';

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <p className="text-xs font-mono uppercase tracking-widest mb-3 text-steel">
          Verificación abierta · Sin registro requerido
        </p>
        <h1 className="font-display text-navy text-4xl leading-tight mb-4">¿Es auténtico este certificado?</h1>
        <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">{descripcion}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {botonModo('codigo', 'Por código')}
        {botonModo('hash', 'Por hash')}
        {botonModo('tarjeta', 'Por tarjeta RFID')}
      </div>

      <div className="bg-white border border-gray-200 rounded-sm p-6 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              const value = e.target.value;
              if (verifyState !== 'idle' || hashState !== 'idle' || tarjetaCerts.length > 0) reset();
              setQuery(value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
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
      </div>

      {((verifyState === 'error' || hashState === 'error' || tarjetaError) && (
        <p className="text-center text-xs text-red-600 mb-6">{errorMsg || tarjetaError}</p>
      ))}

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
                Verifica que el código esté escrito correctamente. Este sistema no puede ser manipulado — todos los
                certificados auténticos están registrados inmutablemente.
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
              Verificá que el hash esté escrito correctamente. Los certificados auténticos quedan registrados de forma
              inmutable en la blockchain.
            </p>
          </div>
        </div>
      )}

      {/* ── Modo tarjeta ────────────────────────────────────── */}
      {tarjetaCerts.length === 0 && tarjetaUid && !tarjetaError && (
        <div className="rounded-sm border-2 overflow-hidden" style={{ borderColor: '#c0392b' }}>
          <div className="flex items-center gap-3 px-5 py-4 bg-[#fdf4f3]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-invalid text-white">
              <XIcon size={16} />
            </div>
            <div>
              <p className="font-semibold text-red-800 text-sm">Tarjeta sin certificados</p>
              <p className="text-red-700 text-xs">La credencial {tarjetaUid} no tiene certificados asociados.</p>
            </div>
          </div>
        </div>
      )}

      {tarjetaCerts.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-gray-400 font-mono">
            Credencial <span className="text-gray-700">{tarjetaUid}</span> · {tarjetaCerts.length} certificado(s)
          </p>
          {tarjetaCerts.map((tc) => {
            const color =
              tc.estado === 'valid' ? '#1a7a4a' : tc.estado === 'revoked' || tc.estado === 'invalid' ? '#c0392b' : '#b45309';
            const titulo =
              tc.estado === 'valid'
                ? 'Certificado auténtico'
                : tc.estado === 'revoked'
                  ? 'Certificado revocado'
                  : tc.estado === 'invalid'
                    ? 'No está en la blockchain'
                    : 'No se pudo verificar';
            const detalle =
              tc.estado === 'valid'
                ? 'Registrado en blockchain · No revocado'
                : tc.estado === 'revoked'
                  ? 'Fue revocado on-chain.'
                  : tc.estado === 'invalid'
                    ? 'El hash no existe en la cadena.'
                    : 'Error al consultar la cadena.';
            return (
              <div key={tc.cert.codigo} className="rounded-sm border-2 overflow-hidden" style={{ borderColor: color }}>
                <div
                  className={`flex items-center gap-3 px-5 py-4 ${tc.estado === 'valid' ? 'bg-[#f0faf4]' : 'bg-[#fdf4f3]'}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white"
                    style={{ backgroundColor: color }}
                  >
                    {tc.estado === 'valid' ? <CheckIcon size={16} /> : <XIcon size={16} />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color }}>
                      {titulo}
                    </p>
                    <p className="text-xs text-gray-500">{detalle}</p>
                  </div>
                </div>
                <div className="bg-white px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t" style={{ borderColor: `${color}33` }}>
                  <CampoTarjeta label="Institución" value={tc.cert.institucion} />
                  <CampoTarjeta label="Titular" value={tc.cert.nombreEstudiante} />
                  <CampoTarjeta label="Carrera" value={tc.cert.carrera} />
                  <CampoTarjeta label="Fecha de emisión" value={tc.cert.fechaEmision} />
                  <CampoTarjeta label="Código" value={tc.cert.codigo} />
                  <CampoTarjeta
                    label="Verificación on-chain"
                    value={
                      tc.onChain
                        ? `exists=${tc.onChain.exists} · revoked=${tc.onChain.isRevoked}`
                        : '—'
                    }
                  />
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <p className="text-xs text-gray-400 font-mono break-all">Hash: {tc.cert.hash}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CampoTarjeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium break-all">{value || '—'}</p>
    </div>
  );
}
