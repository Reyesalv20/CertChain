'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { conectarLectorRfid, bluetoothDisponible, type ConexionBluetoothRfid } from '@/lib/bluetooth';

// Equivalente por Bluetooth de useLectorRfid (que usa SSE/WiFi). A diferencia
// de aquel, este no se conecta solo: Web Bluetooth exige un gesto del usuario
// (click) para elegir el dispositivo, así que expone conectar()/desconectar().
export function useBluetoothRfid({ onUid }: { onUid?: (uid: string) => void }) {
  const [conectado, setConectado] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [error, setError] = useState('');
  // navigator.bluetooth no existe en el servidor: si se calcula directo en el
  // render, el HTML del servidor (sin soporte) no coincide con el del
  // navegador real y React tira un error de hydration. Se arranca en `true`
  // (mismo valor en servidor y primer render del cliente) y se corrige acá,
  // en un efecto — que solo corre en el navegador, después de esa comparación.
  const [soportado, setSoportado] = useState(true);
  const cbRef = useRef(onUid);
  cbRef.current = onUid;
  const conexionRef = useRef<ConexionBluetoothRfid | null>(null);

  useEffect(() => {
    setSoportado(bluetoothDisponible());
  }, []);

  const desconectar = useCallback(() => {
    conexionRef.current?.desconectar();
    conexionRef.current = null;
    setConectado(false);
  }, []);

  const conectar = useCallback(async () => {
    if (!bluetoothDisponible()) {
      setError('Este navegador no soporta Bluetooth. Usa Chrome o Edge en una computadora.');
      return;
    }
    setConectando(true);
    setError('');
    try {
      const conexion = await conectarLectorRfid(
        (uid) => cbRef.current?.(uid),
        () => {
          conexionRef.current = null;
          setConectado(false);
        },
      );
      conexionRef.current = conexion;
      setConectado(true);
    } catch (err) {
      // El usuario cerró el picker sin elegir nada: no es un error real.
      const msg = err instanceof Error ? err.message : 'No se pudo conectar por Bluetooth.';
      if (!msg.toLowerCase().includes('user cancelled')) setError(msg);
    } finally {
      setConectando(false);
    }
  }, []);

  return { conectado, conectando, error, conectar, desconectar, soportado };
}
