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
import { BluetoothLectorStatus } from '@/components/BluetoothLectorStatus';
import { VincularTarjetaPanel } from '@/components/VincularTarjetaPanel';
import { FloatingChat } from '@/components/FloatingChat';
import { useBluetoothRfid } from '@/hooks/useBluetoothRfid';
import { api } from '@/lib/api';
import { verificarCertificado, type ResultadoVerificacionHash } from '@/lib/blockchain';
import type { Certificado, CertificadoTarjeta, MetadataCertificado } from '@/lib/types';

type VerifyState = 'idle' | 'valid' | 'invalid' | 'revoked' | 'error';
type HashState = 'idle' | 'valid' | 'revoked' | 'invalid' | 'error';
type Modo = 'codigo' | 'hash' | 'tarjeta';

interface CertTarjetaVerificado {
  cert: CertificadoTarjeta;
  onChain: ResultadoVerificacionHash | null;
  estado: 'valid' | 'revoked' | 'invalid' | 'error';
}

export default function VerificarPage() {
  const [modo, setModo] = useState<Modo>('hash');
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

  // Si entran con un query param, se pre-selecciona el modo, se rellena el campo
  // y se verifica automáticamente:
  //   ?codigo=...  → modo "Por código"
  //   ?hash=...    → modo "Por hash"
  //   ?credencial=... o ?card_id=... → modo "Por tarjeta RFID"
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('codigo');
    const hash = params.get('hash');
    const credencial = params.get('credencial') ?? params.get('card_id');

    if (credencial) {
      setModo('tarjeta');
      setQuery(credencial);
      void handleVerificarTarjeta(credencial);
    } else if (hash) {
      setModo('hash');
      setQuery(hash);
      void verificar('hash', hash);
    } else if (codigo) {
      setModo('codigo');
      setQuery(codigo);
      void verificar('codigo', codigo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // En modo tarjeta, escucha el lector RFID por Bluetooth (BLE, ESP32-C5):
  // al escanear, auto-verifica.
  const { conectado: btConectado, conectando: btConectando, error: btError, conectar: btConectar, desconectar: btDesconectar, soportado: btSoportado } = useBluetoothRfid({
    onUid: (uid) => {
      setQuery(uid);
      reset();
      void handleVerificarTarjeta(uid);
    },
  });

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
      // Tarjeta nunca registrada: no hay credencial, así que tampoco hay
      // certificados que verificar — mismo caso visual que "sin certificados"
      // (el panel de vincular la crea si hace falta).
      if (!resultado.valido) {
        setTarjetaUid(uid.trim());
        setTarjetaCerts([]);
        return;
      }
      setTarjetaUid(resultado.credencial.uid);
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

  // Ejecuta la verificación para un modo y valor dados (sin depender del estado
  // "modo" actual). Lo usa el botón y también los params ?codigo / ?hash /
  // ?credencial / ?card_id al entrar a la página.
  async function verificar(modoActual: Modo, valor: string) {
    const limpio = valor.trim();
    if (!limpio) return;
    setSearching(true);
    setErrorMsg('');
    setTarjetaError('');
    try {
      if (modoActual === 'codigo') {
        // 1) Resuelve el código en el registro (metadata + hash).
        const resultado = await api.verificarCertificado(limpio);
        if (!resultado.valido || !resultado.certificado) {
          setCertificado(null);
          setVerifyState('invalid');
          return;
        }
        const c = resultado.certificado;

        // 2) Valida on-chain el hash, igual que en el modo "Por hash".
        let onChain: ResultadoVerificacionHash | null = null;
        try {
          onChain = await verificarCertificado(c.hash);
        } catch {
          onChain = null;
        }

        setCertificado(c);
        setResultadoHash(onChain);
        setMetadata({
          institucion: c.institucion ?? '—',
          nombreEstudiante: c.nombreEstudiante,
          carrera: c.carrera,
          fechaEmision: c.fechaEmision,
          codigo: c.codigo,
        });

        if (!onChain) {
          setErrorMsg('No se pudo validar en la blockchain. Intentalo en unos segundos.');
          setVerifyState('error');
        } else if (!onChain.exists) {
          setCertificado(null);
          setVerifyState('invalid');
        } else {
          // Revocado en cadena o marcado revocado en el registro => revocado.
          setVerifyState(onChain.isRevoked || c.estado === 'revocado' ? 'revoked' : 'valid');
        }
      } else if (modoActual === 'hash') {
        const onChain = await verificarCertificado(limpio);
        setResultadoHash(onChain);
        if (!onChain.exists) {
          setMetadata(null);
          setHashState('invalid');
        } else {
          setMetadata(await api.obtenerMetadataPorHash(limpio).catch(() => null));
          setHashState(onChain.isRevoked ? 'revoked' : 'valid');
        }
      } else {
        await handleVerificarTarjeta(limpio);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo verificar el certificado.');
      if (modoActual === 'codigo') setVerifyState('error');
      else if (modoActual === 'hash') setHashState('error');
    } finally {
      setSearching(false);
    }
  }

  async function handleVerify() {
    await verificar(modo, query);
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
        : 'Ingresa el UID de la tarjeta RFID o conecta el lector por Bluetooth y escanéala.';

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

      {modo === 'tarjeta' && (
        <div className="flex justify-center -mt-3 mb-6">
          <BluetoothLectorStatus
            conectado={btConectado}
            conectando={btConectando}
            soportado={btSoportado}
            error={btError}
            onConectar={btConectar}
            onDesconectar={btDesconectar}
          />
        </div>
      )}

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
          <ChatAssistant
            certFound={true}
            codigoCertificado={certificado.codigo}
            contexto={{
              modo: 'codigo',
              query: certificado.codigo,
              estado: verifyState,
              certificado: {
                codigo: certificado.codigo,
                nombreEstudiante: certificado.nombreEstudiante,
                institucion: certificado.institucion ?? '—',
                carrera: certificado.carrera,
                fechaEmision: certificado.fechaEmision,
                hash: certificado.hash,
                estado: certificado.estado,
              },
              onChain: resultadoHash ? {
                exists: resultadoHash.exists,
                issuer: resultadoHash.issuer,
                issueTimestamp: resultadoHash.issueTimestamp,
                isRevoked: resultadoHash.isRevoked,
                valid: resultadoHash.valid,
              } : null,
            }}
          />
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
          <ChatAssistant
            certFound={false}
            codigoCertificado={query.trim()}
            contexto={{
              modo: 'codigo',
              query: query.trim(),
              estado: 'invalid',
              certificado: null,
              onChain: null,
            }}
          />
        </div>
      )}

      {verifyState === 'revoked' && certificado && (
        <div className="rounded-sm border-2 overflow-hidden" style={{ borderColor: '#c0392b' }}>
          <div className="flex items-center gap-3 px-5 py-4 bg-[#fdf4f3]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-invalid text-white">
              <XIcon size={16} />
            </div>
            <div>
              <p className="font-semibold text-red-800 text-sm">Certificado revocado</p>
              <p className="text-red-700 text-xs">
                Este certificado fue revocado en la blockchain y ya no es válido.
              </p>
            </div>
          </div>
          <div className="bg-white px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-red-100">
            {[
              { label: 'Institución', value: certificado.institucion ?? '—' },
              { label: 'Titular', value: certificado.nombreEstudiante },
              { label: 'Carrera', value: certificado.carrera },
              { label: 'Código', value: certificado.codigo },
              {
                label: 'Fecha (blockchain)',
                value:
                  resultadoHash && Number(resultadoHash.issueTimestamp) > 0
                    ? new Date(Number(resultadoHash.issueTimestamp) * 1000).toLocaleString()
                    : '—',
              },
              { label: 'Emisor (wallet)', value: resultadoHash?.issuer ?? '—' },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-0.5">{f.label}</p>
                <p className="text-sm text-gray-800 font-medium break-all">{f.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 border-t border-red-100 px-5 py-3">
            <p className="text-xs text-gray-400 font-mono break-all">Hash: {certificado.hash}</p>
          </div>
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
        <div className="flex flex-col gap-4">
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
          <VincularTarjetaPanel
            uid={tarjetaUid}
            modo="primeraVez"
            onVinculado={() => void handleVerificarTarjeta(tarjetaUid)}
          />
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
          <VincularTarjetaPanel
            uid={tarjetaUid}
            modo="agregarOtro"
            onVinculado={() => void handleVerificarTarjeta(tarjetaUid)}
          />
        </div>
      )}

      <FloatingChat pageMode="verificacion" />
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
