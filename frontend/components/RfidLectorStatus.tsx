'use client';

// Indicador visual de que la página está escuchando al lector RFID (SSE).
// Muestra un punto verde si el EventSource está conectado y ámbar mientras
// intenta conectar. Se oculta si "activo" es false.

export function RfidLectorStatus({
  activo,
  conectado,
}: {
  activo: boolean;
  conectado: boolean;
}) {
  if (!activo) return null;

  return (
    <p className="flex items-center gap-2 text-xs text-gray-500">
      <span
        className="inline-block w-2 h-2 rounded-full animate-pulse"
        style={{ backgroundColor: conectado ? '#1a7a4a' : '#b45309' }}
        title={conectado ? 'Conectado al backend' : 'Reconectando…'}
      />
      {conectado
        ? 'Lector listo: acercá la credencial RFID.'
        : 'Esperando lector (conectando)…'}
    </p>
  );
}
