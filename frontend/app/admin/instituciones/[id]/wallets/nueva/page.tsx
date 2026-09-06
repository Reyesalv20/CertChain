'use client';

// Admin: alta de wallet de emisión para una institución.
// 1) Conectá la wallet ADMIN del contrato (la que desplegó los contratos) en el
//    panel derecho.
// 2) Cargá la dirección de la wallet de emisión y una etiqueta.
// 3) "Registrar y firmar" firma addIssuer(...) on-chain y luego la guarda en la
//    base (institucion_wallets).

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WalletPanel } from '@/components/WalletPanel';
import { useWallet } from '@/hooks/useWallet';
import { registrarEmisor } from '@/lib/wallet';
import { api, ApiError } from '@/lib/api';

function esDireccionValida(d: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(d.trim());
}

export default function NuevaWalletPage({ params }: { params: { id: string } }) {
  const institucionId = Number(params.id);
  const router = useRouter();
  const { cuenta } = useWallet();

  const [address, setAddress] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [txHash, setTxHash] = useState('');
  const [paso, setPaso] = useState<'form' | 'firmando' | 'listo'>('form');

  async function registrar() {
    if (paso !== 'form') return;
    setError('');
    setOk('');

    if (!cuenta) {
      setError('Conectá primero la wallet del administrador en el panel derecho.');
      return;
    }
    if (!esDireccionValida(address)) {
      setError('La dirección debe ser 0x + 40 caracteres hexadecimales.');
      return;
    }

    setPaso('firmando');
    try {
      const tx = await registrarEmisor(address.trim(), etiqueta.trim() || 'Emisor');
      await api.agregarWalletInstitucion(institucionId, {
        address: address.trim(),
        etiqueta: etiqueta.trim() || undefined,
      });
      setTxHash(tx);
      setOk('Wallet registrada on-chain y guardada en la institución.');
      setPaso('listo');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la wallet.');
      setPaso('form');
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-8 font-mono uppercase tracking-widest">
        <Link href="/admin/instituciones" className="hover:text-steel">Administración</Link>
        <span>/</span>
        <Link href={`/admin/instituciones/${institucionId}`} className="hover:text-steel">Institución</Link>
        <span>/</span>
        <span className="text-steel">Nueva wallet</span>
      </div>
      <h1 className="font-display text-navy text-3xl mb-6">Agregar wallet de emisión</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] items-start">
        {/* Formulario */}
        <div className="bg-white border border-gray-200 rounded-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Datos de la wallet</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">
                Dirección de la wallet de emisión
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x + 40 caracteres hexadecimales"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">
                Etiqueta
              </label>
              <input
                value={etiqueta}
                onChange={(e) => setEtiqueta(e.target.value)}
                placeholder="Ej. Emisión de títulos 2026"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-sm outline-none"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            {ok && (
              <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-sm px-3 py-2">
                <p>{ok}</p>
                {txHash && <p className="font-mono mt-1 break-all">tx: {txHash}</p>}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={registrar}
                disabled={paso === 'firmando' || paso === 'listo'}
                className="px-5 py-2.5 text-sm font-semibold text-white rounded-sm border-none disabled:opacity-50"
                style={{ backgroundColor: paso === 'listo' ? '#4a8fa8' : '#1F4E5F' }}
              >
                {paso === 'firmando' ? 'Firmando en MetaMask…' : paso === 'listo' ? 'Registrada ✓' : 'Registrar y firmar'}
              </button>
              <Link href={`/admin/instituciones/${institucionId}`} className="text-sm text-gray-500 hover:text-navy">
                ← Volver a la institución
              </Link>
            </div>
          </div>
        </div>

        {/* Panel de firma */}
        <div className="lg:sticky lg:top-6">
          <WalletPanel />
          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
            La firma la hace la cuenta <strong>admin del contrato</strong> (con la que se desplegaron los contratos en anvil).
            Si esa cuenta no está autorizada, la transacción revierte.
          </p>
        </div>
      </div>
    </div>
  );
}
