/*// backend/src/certificados/subida-cache.service.ts
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface SubidaPendiente {
  buffer: Buffer;
  archivoNombre: string;
  institucionId: number;
  expiresAt: number;
}

const TTL_MS = 15 * 60 * 1000; // 15 minutos

@Injectable()
export class SubidaCacheService {
  private cache = new Map<string, SubidaPendiente>();

  guardar(buffer: Buffer, archivoNombre: string, institucionId: number): string {
    this.limpiarExpiradas();
    const subidaId = randomUUID();
    this.cache.set(subidaId, {
      buffer,
      archivoNombre,
      institucionId,
      expiresAt: Date.now() + TTL_MS,
    });
    return subidaId;
  }

  obtener(subidaId: string, institucionId: number): SubidaPendiente | undefined {
    const entrada = this.cache.get(subidaId);
    if (!entrada || entrada.expiresAt < Date.now()) return undefined;
    if (entrada.institucionId !== institucionId) return undefined; // evita que una institución use el subidaId de otra
    return entrada;
  }

  eliminar(subidaId: string): void {
    this.cache.delete(subidaId);
  }

  private limpiarExpiradas(): void {
    const ahora = Date.now();
    for (const [id, entrada] of this.cache.entries()) {
      if (entrada.expiresAt < ahora) this.cache.delete(id);
    }
  }
}*/

// backend/src/certificados/subida-cache.service.ts
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface SubidaPendiente {
  hash: string;
  institucionId: number;
  expiresAt: number;
}

const TTL_MS = 15 * 60 * 1000;

@Injectable()
export class SubidaCacheService {
  private cache = new Map<string, SubidaPendiente>();

  guardar(hash: string, institucionId: number): string {
    this.limpiarExpiradas();
    const subidaId = randomUUID();
    this.cache.set(subidaId, { hash, institucionId, expiresAt: Date.now() + TTL_MS });
    return subidaId;
  }

  obtener(subidaId: string, institucionId: number): SubidaPendiente | undefined {
    const entrada = this.cache.get(subidaId);
    if (!entrada || entrada.expiresAt < Date.now()) return undefined;
    if (entrada.institucionId !== institucionId) return undefined;
    return entrada;
  }

  eliminar(subidaId: string): void {
    this.cache.delete(subidaId);
  }

  private limpiarExpiradas(): void {
    const ahora = Date.now();
    for (const [id, entrada] of this.cache.entries()) {
      if (entrada.expiresAt < ahora) this.cache.delete(id);
    }
  }
}