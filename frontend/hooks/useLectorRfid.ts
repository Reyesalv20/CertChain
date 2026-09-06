'use client';
import { useEffect, useRef, useState } from 'react';

// Escucha los UIDs que llegan del lector RFID vía SSE del backend
// (GET {BACKEND}/reader/events). Cada página que quiera capturar un escaneo lo
// usa con onUid. Mientras "activo" es true se mantiene un solo EventSource.
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

export function useLectorRfid({
  activo,
  onUid,
}: {
  activo: boolean;
  onUid?: (uid: string) => void;
}) {
  const [escuchando, setEscuchando] = useState(false);
  const [conectado, setConectado] = useState(false);
  const cbRef = useRef(onUid);
  cbRef.current = onUid;

  useEffect(() => {
    if (!activo) {
      setEscuchando(false);
      setConectado(false);
      return;
    }

    setEscuchando(true);
    const es = new EventSource(`${BACKEND_URL}/reader/events`);

    es.onopen = () => setConectado(true);
    es.onerror = () => setConectado(false);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as { uid?: string };
        if (data.uid) cbRef.current?.(data.uid);
      } catch {
        // mensaje no JSON: se ignora
      }
    };

    return () => {
      es.close();
      setEscuchando(false);
      setConectado(false);
    };
  }, [activo]);

  return { escuchando, conectado };
}
