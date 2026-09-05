import type { InterfaceAbi } from 'ethers';

export interface ContratoConfig {
  address: string;
  abi: InterfaceAbi;
}

export interface BlockchainConfig {
  chainId: string;
  certificates: ContratoConfig;
  registry: ContratoConfig;
}

let cache: BlockchainConfig | null = null;

export async function obtenerConfig(): Promise<BlockchainConfig> {
    if (cache) return cache;

    // "/blockchain/config" va por el rewrite de Next.js (ver next.config.js),
    // así el navegador no hace fetch cross-origin y evitamos el bloqueo de CORS.
    const res = await fetch('/blockchain/config');
    if (!res.ok) throw new Error('No se pudo obtener la configuracion de la blockchain');

    cache = (await res.json()) as BlockchainConfig;
    return cache;
}

export interface ResultadoVerificacionHash {
    exists: boolean;
    issuer: string;
    issueTimestamp: string;
    isRevoked: boolean;
    valid: boolean;
}

export async function verificarCertificado(certHash: string): Promise<ResultadoVerificacionHash> {
    const res = await fetch('/blockchain/verifyCertificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certHash }),
    });
    if (!res.ok) throw new Error('No se pudo verificar el certificado');

    const data = (await res.json()) as ResultadoVerificacionHash;
    return data;
}
