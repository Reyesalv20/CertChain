'use client';

// Panel derecho de wallet (envuelve MetaMask).
// Muestra estado de conexión (cuenta, balance, red). El cambio de cuenta se
// hace en la extensión de MetaMask; el panel se actualiza con accountsChanged.

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/hooks/useWallet';

export function WalletPanel() {
  const { cuenta, conectando, error, conectarWallet } = useWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [red, setRed] = useState<string | null>(null);

  useEffect(() => {
    if (!cuenta) {
      setBalance(null);
      setRed(null);
      return;
    }
    let activo = true;
    (async () => {
      try {
        const ethereum = window.ethereum;
        if (!ethereum) return;
        const provider = new ethers.BrowserProvider(ethereum);
        const bal = await provider.getBalance(cuenta);
        const net = await provider.getNetwork();
        if (activo) {
          setBalance(ethers.formatEther(bal));
          setRed(`${net.name} · ${Number(net.chainId)}`);
        }
      } catch {
        // si no se puede leer, se deja vacío
      }
    })();
    return () => {
      activo = false;
    };
  }, [cuenta]);

  const corta = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Wallet</h3>
        {cuenta && <span className="w-2.5 h-2.5 rounded-full bg-valid" title="Conectada" />}
      </div>

      {!cuenta ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <button
            onClick={conectarWallet}
            disabled={conectando}
            className="w-full py-2.5 text-sm font-semibold text-white rounded-sm border-none transition-all disabled:opacity-50"
            style={{ backgroundColor: conectando ? '#4a8fa8' : '#1F4E5F' }}
          >
            {conectando ? 'Conectando…' : 'Conectar MetaMask'}
          </button>
          <p className="text-xs text-gray-400">Conectá MetaMask para firmar transacciones.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Cuenta</p>
            <p className="text-sm font-mono text-gray-800" title={cuenta}>
              {corta(cuenta)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Balance</p>
              <p className="text-sm text-gray-800 font-medium">
                {balance !== null ? `${Number(balance).toFixed(4)} ETH` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Red</p>
              <p className="text-sm text-gray-800 font-medium">{red ?? '—'}</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Para cambiar de cuenta, usá el selector de la extensión de MetaMask. El panel se actualiza solo.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
    </div>
  );
}
