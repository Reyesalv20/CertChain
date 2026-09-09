'use client';

// Botón + indicador de estado del lector RFID por Bluetooth (BLE, ESP32-C5).
//
// Ojo: la ventana "quiere emparejar" que abre Chrome al hacer click es del
// navegador/sistema operativo, no nuestra — por seguridad ninguna página web
// puede personalizarla. Lo que sí controlamos es todo lo de acá: el botón, el
// estado y el texto que guía a la persona mientras esa ventana está abierta.

import { BluetoothIcon, CheckIcon } from './icons';

export function BluetoothLectorStatus({
  conectado,
  conectando,
  soportado,
  error,
  onConectar,
  onDesconectar,
}: {
  conectado: boolean;
  conectando: boolean;
  soportado: boolean;
  error?: string;
  onConectar: () => void;
  onDesconectar: () => void;
}) {
  if (!soportado) {
    return (
      <p className="text-xs text-amber-700 text-center max-w-xs mx-auto">
        Tu navegador no soporta Bluetooth. Usa Chrome o Edge en una computadora para escanear la tarjeta.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={conectado ? onDesconectar : onConectar}
        disabled={conectando}
        className="flex items-center gap-2.5 pl-4 pr-5 py-2.5 text-sm font-semibold rounded-full border-none transition-all disabled:opacity-80"
        style={{
          backgroundColor: conectado ? '#f0faf4' : '#1F4E5F',
          color: conectado ? '#1a7a4a' : '#fff',
          boxShadow: conectado ? 'inset 0 0 0 1px #1a7a4a33' : 'none',
        }}
      >
        <span
          className="flex items-center justify-center w-6 h-6 rounded-full shrink-0"
          style={{ backgroundColor: conectado ? '#1a7a4a' : 'rgba(255,255,255,0.15)' }}
        >
          {conectado ? (
            <CheckIcon size={13} />
          ) : (
            <BluetoothIcon size={13} color="#fff" />
          )}
        </span>
        {conectando ? 'Abriendo Bluetooth…' : conectado ? 'Lector conectado' : 'Conectar lector por Bluetooth'}
        {conectado && <span className="text-xs font-normal opacity-70 ml-0.5">· toca para desconectar</span>}
      </button>

      {conectando && (
        <p className="text-xs text-amber-700 max-w-xs text-center leading-relaxed">
          Elige <span className="font-semibold">“CertChain-RFID”</span> en la ventana de Chrome que se abrió y
          presiona <span className="font-semibold">Pair</span>.
        </p>
      )}

      {conectado && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1a7a4a] animate-pulse" />
          Acerca tu tarjeta al lector
        </p>
      )}

      {error && <p className="text-xs text-red-600 text-center max-w-xs">{error}</p>}
    </div>
  );
}
