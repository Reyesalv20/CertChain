import { BrowserProvider, Contract, type Eip1193Provider } from 'ethers';

import { obtenerConfig } from './blockchain';

declare global {
    interface Window {
        ethereum?: Eip1193Provider;
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

export async function registrarCertificado(certHash: string): Promise<string> {
    const ethereum = window.ethereum;
    if (!ethereum) throw new Error('Instala MetaMask y desbloquea tu wallet');

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
}


