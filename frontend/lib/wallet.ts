import { BrowserProvider, Contract, type Eip1193Provider } from 'ethers';

import { obtenerConfig } from './blockchain';

export interface MetaMaskProvider extends Eip1193Provider {
    on(event: string, listener: (...args: any[]) => void): void;
    removeListener(event: string, listener: (...args: any[]) => void): void;
}

declare global {
    interface Window {
        ethereum?: MetaMaskProvider;
    }
}

export function hayMetaMask(): boolean {
    return typeof window !== 'undefined' && Boolean(window.ethereum);
}

export async function conectar(): Promise<string> {
    const ethereum = window.ethereum;
    if (!ethereum) throw new Error('Instala MetaMask y desbloquea tu wallet');

    const provider = new BrowserProvider(ethereum);
    await provider.send('eth_requestAccounts', []);

    const signer = await provider.getSigner();
    return signer.getAddress();
}

export function formatearErrorFirma(err: unknown): string {
    const e = err as {
        code?: string | number;
        info?: { error?: { code?: string | number } };
        revert?: { args?: unknown[] };
        shortMessage?: string;
        message?: string;
    };

    // 1) El usuario rechazó la transacción en MetaMask.
    if (e?.code === 'ACTION_REJECTED' || e?.code === 4001 || e?.info?.error?.code === 4001) {
        return 'Transacción cancelada';
    }

    // 2) No alcanza el saldo para pagar el gas.
    if (e?.code === 'INSUFFICIENT_FUNDS') {
        return 'No tenés suficiente ETH para pagar el gas';
    }

    // 3) El contrato revirtió: el motivo viene en revert.args[0] o shortMessage.
    const motivo = e?.revert?.args?.[0] ?? e?.shortMessage;
    if (typeof motivo === 'string' && motivo.length > 0) {
        if (motivo.includes('Emisor no autorizado')) {
            return 'Tu wallet no está registrada como emisor confiable';
        }
        if (motivo.includes('ya fue registrado')) {
            return 'Ese certificado ya fue registrado';
        }
        return motivo;
    }

    // 4) Fallback genérico.
    return typeof e?.message === 'string' && e.message ? e.message : 'Error desconocido';
}

export async function registrarCertificado(certHash: string): Promise<string> {
    const ethereum = window.ethereum;
    if (!ethereum) throw new Error('Instala MetaMask y desbloquea tu wallet');

    try {
        const config = await obtenerConfig();
        const provider = new BrowserProvider(ethereum);
        const signer = await provider.getSigner();

        const contrato = new Contract(
            config.certificates.address,
            config.certificates.abi,
            signer,
        );

        await contrato.registerCertificate.staticCall(certHash);

        const tx = await contrato.registerCertificate(certHash);
        await tx.wait();

        return tx.hash;
    } catch (err) {
        throw new Error(formatearErrorFirma(err));
    }
}

