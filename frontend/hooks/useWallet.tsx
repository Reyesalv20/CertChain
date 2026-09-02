'use client';
import { useCallback, useState, createContext, useContext, type ReactNode } from 'react';
import { conectar } from '@/lib/wallet';

interface WalletContextValue {
    cuenta: string | null;
    conectando: boolean;
    error: string;
    conectarWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

// Proveedor: dueño del estado de la wallet. Envuelve la sección institucional.
export function WalletProvider({ children }: { children: ReactNode }) {
  const [cuenta, setCuenta] = useState<string | null>(null);
  const [conectando, setConectando] = useState(false);
  const [error, setError] = useState('');

  const conectarWallet = useCallback(async () => {
    setConectando(true);
    setError('');
    try {
      setCuenta(await conectar());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar la wallet');
    } finally {
      setConectando(false);
    }
  }, []);

  // TODO (futuro): suscribir a window.ethereum.on('accountsChanged') para
  // actualizar `cuenta` si el usuario cambia de cuenta en MetaMask.

  return (
    <WalletContext.Provider value={{ cuenta, conectando, error, conectarWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

// Hook que cualquier componente usa para leer/comandar la wallet.
export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet debe usarse dentro de <WalletProvider>');
  return ctx;
}
