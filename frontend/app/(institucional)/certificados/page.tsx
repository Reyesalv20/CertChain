'use client';

// Ruta protegida: "/certificados" (requiere cookie certchain_token, ver middleware.ts)
// Flujo en dos pasos, ambos contra el backend:
//   1. POST /certificados/subir   -> sube el PDF, el backend devuelve datos prellenados
//   2. POST /certificados         -> genera el hash y registra en blockchain

import { useEffect, useRef, useState } from 'react';
import { BlockchainIcon, FileIcon } from '@/components/icons';
import { api, ApiError } from '@/lib/api';
import type { ActividadReciente, Certificado, SubidaCertificado } from '@/lib/types';

type Paso = 'idle' | 'subiendo' | 'subido' | 'registrando' | 'registrado';

export default function CertificadosPage() {
  const [paso, setPaso] = useState<Paso>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [archivoNombre, setArchivoNombre] = useState('');
  const [subida, setSubida] = useState<SubidaCertificado | null>(null);
  const [nombreEstudiante, setNombreEstudiante] = useState('');
  const [carrera, setCarrera] = useState('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [certificado, setCertificado] = useState<Certificado | null>(null);
  const [error, setError] = useState('');
  const [recientes, setRecientes] = useState<ActividadReciente[]>([]);
  const [cargandoRecientes, setCargandoRecientes] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .obtenerRecientes()
      .then(setRecientes)
      .catch(() => setRecientes([]))
      .finally(() => setCargandoRecientes(false));
  }, [paso === 'registrado']);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError('');
    setArchivoNombre(file.name);
    setPaso('subiendo');
    try {
      const resultado = await api.subirCertificado(file);
      setSubida(resultado);
      setNombreEstudiante(resultado.nombreEstudiante);
      setCarrera(resultado.carrera);
      setFechaEmision(resultado.fechaEmision);
      setPaso('subido');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo subir el archivo.');
      setPaso('idle');
    }
  }

  async function handleRegister() {
    if (!subida) return;
    setPaso('registrando');
    setError('');
    try {
      const resultado = await api.registrarCertificado({
        subidaId: subida.subidaId,
        nombreEstudiante,
        carrera,
        fechaEmision,
      });
      setCertificado(resultado);
      setPaso('registrado');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el certificado en blockchain.');
      setPaso('subido');
    }
  }

  function reset() {
    setPaso('idle');
    setArchivoNombre('');
    setSubida(null);
    setNombreEstudiante('');
    setCarrera('');
    setFechaEmision('');
    setCertificado(null);
    setError('');
  }

  const isRegistered = paso === 'registrado';
  const isBusy = paso === 'subiendo' || paso === 'registrando';

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-8 font-mono uppercase tracking-widest">
        <span>Portal institucional</span>
        <span>/</span>
        <span className="text-steel">Emisión de certificado</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display text-navy text-3xl">Emitir certificado</h1>
            {isRegistered && (
              <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none">
                + Nuevo certificado
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 mb-5">
              <p className="text-red-700 text-xs">{error}</p>
            </div>
          )}

          {!isRegistered && (
            <div
              className={`rounded-sm border-2 border-dashed transition-all mb-6 cursor-pointer ${
                dragOver ? 'border-steel bg-blue-50/60' : 'border-gray-200 bg-white'
              }`}
              style={{ minHeight: 160 }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (paso === 'idle') handleFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => paso === 'idle' && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {paso === 'idle' ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="mb-4 text-gray-300">
                    <FileIcon size={44} />
                  </div>
                  <p className="text-gray-700 font-medium text-sm mb-1">Arrastra el PDF aquí</p>
                  <p className="text-gray-400 text-xs">o haz clic para seleccionar · Solo archivos .pdf</p>
                </div>
              ) : (
                <div className="flex items-center gap-4 px-6 py-5">
                  <div className="text-steel">
                    <FileIcon size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{archivoNombre}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {paso === 'subiendo' ? 'Subiendo...' : 'PDF cargado'}
                    </p>
                  </div>
                  {paso !== 'subiendo' && (
                    <div className="ml-auto">
                      <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                        Cargado
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isRegistered && (
            <div className="rounded-sm border border-green-200 bg-green-50 p-5 mb-6">
              <p className="font-semibold text-green-800 text-sm">Certificado registrado en blockchain</p>
              <p className="text-green-700 text-xs mt-1">La transacción ha sido confirmada y es permanente.</p>
            </div>
          )}

          {paso !== 'idle' && paso !== 'subiendo' && (
            <div className="bg-white border border-gray-200 rounded-sm p-6 flex flex-col gap-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-3">
                Datos del certificado
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                    Nombre del estudiante
                  </label>
                  <input
                    type="text"
                    value={nombreEstudiante}
                    onChange={(e) => setNombreEstudiante(e.target.value)}
                    disabled={isRegistered}
                    className="w-full px-3 py-2.5 text-sm rounded-sm border border-gray-200 outline-none disabled:bg-gray-50 disabled:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                    Fecha de emisión
                  </label>
                  <input
                    type="date"
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    disabled={isRegistered}
                    className="w-full px-3 py-2.5 text-sm rounded-sm border border-gray-200 outline-none disabled:bg-gray-50 disabled:text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                  Carrera / Programa
                </label>
                <input
                  type="text"
                  value={carrera}
                  onChange={(e) => setCarrera(e.target.value)}
                  disabled={isRegistered}
                  className="w-full px-3 py-2.5 text-sm rounded-sm border border-gray-200 outline-none disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>

              {isRegistered && certificado && (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                      Hash blockchain
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-sm px-3 py-2.5">
                      <p className="font-mono text-xs text-gray-600 break-all">{certificado.hash}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                      Código de verificación
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-sm px-3 py-2.5 flex items-center justify-between">
                      <p className="font-mono text-sm font-medium text-navy">{certificado.codigo}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {paso === 'subido' && (
            <button
              onClick={handleRegister}
              className="mt-5 flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white rounded-sm bg-navy border-none"
            >
              <BlockchainIcon size={16} />
              Registrar en blockchain
            </button>
          )}

          {paso === 'registrando' && (
            <div className="mt-5 flex items-center gap-3 px-5 py-3.5 bg-white border border-gray-200 rounded-sm">
              <div className="w-4 h-4 rounded-full border-2 border-steel border-t-transparent animate-spin" />
              <span className="text-sm text-gray-600 font-mono">Registrando en blockchain...</span>
            </div>
          )}
        </div>

        <div className="lg:w-64 shrink-0">
          <div className="bg-white border border-gray-200 rounded-sm p-5 sticky top-24">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Actividad reciente</h3>
            {cargandoRecientes ? (
              <p className="text-xs text-gray-400">Cargando...</p>
            ) : recientes.length === 0 ? (
              <p className="text-xs text-gray-400">Todavía no hay certificados emitidos.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {recientes.map((r) => (
                  <div key={r.codigo} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <p className="font-mono text-xs text-steel">{r.codigo}</p>
                    <p className="text-xs text-gray-700 mt-0.5">{r.nombreEstudiante}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.fecha}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
