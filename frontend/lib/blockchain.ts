import type { InterfaceAbi } from 'ethers';

const BLOCKCHAIN_SERVICE_URL =
  process.env.NEXT_PUBLIC_BLOCKCHAIN_SERVICE_URL ?? 'http://localhost:6000';

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

    const res = await fetch(`${BLOCKCHAIN_SERVICE_URL}/config`);
    if (!res.ok) throw new Error('No se pudo obtener la configuracion de la blockchain');

    cache = (await res.json()) as BlockchainConfig;
    return cache;
}
