'use client';

import { useWallet } from '@/hooks/useWallet';

export function WalletButton() {
    const { cuenta, conectando, conectarWallet } = useWallet();

    const corta = (addr: string) => `${addr.slice(0,6)}...${addr.slice(-4)}`;

    if (cuenta) {
        return (
            <span className="text-xs font-mono text-white/80 bg-white/10 border border-white/20 rounded-full px-3 py-1.5">
                {corta(cuenta)}
            </span>
        );
    }

    return (
        <button
          onClick={conectarWallet}
          disabled={conectando}
          className="text-white/80 hover:text-white text-sm transition-colors bg-white/10 border border-white/20 rounded-full px-4 py-1.5 cursor-pointer disabled:opacity-50"
        >
          {conectando ? 'Conectando…' : 'Conectar wallet'}
        </button>
      );
}
