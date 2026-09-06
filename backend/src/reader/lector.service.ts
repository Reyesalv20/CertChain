// backend/src/reader/lector.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { CertificadosService } from '../certificados/certificados.service';
import { normalizarUid } from './uid.util';

// Kiosko de verificación (ESP32 + pantalla): dado el UID de una tarjeta
// devuelve la credencial y sus certificados con verificación on-chain por hash.
@Injectable()
export class LectorService {
  constructor(private readonly certificados: CertificadosService) {}

  async tarjeta(uidCrudo: string) {
    const uid = normalizarUid(uidCrudo);
    if (!uid) throw new BadRequestException('UID inválido: debe ser hexadecimal.');

    const resultado = await this.certificados.porRfid(uid);
    if (!resultado.valido || !resultado.credencial) {
      return { valido: false, mensaje: 'No se encontró ninguna credencial con ese UID.' };
    }

    const certificados = await Promise.all(
      (resultado.certificados as any[]).map(async (c) => ({
        nombreEstudiante: c.nombreEstudiante,
        carrera: c.carrera,
        codigo: c.codigo,
        institucion: c.institucion,
        estado: c.estado,
        hash: c.hash,
        onChain: await this.verificarOnChain(c.hash),
      })),
    );

    return {
      valido: true,
      credencial: { uid: resultado.credencial.uid, codigo: resultado.credencial.codigo ?? null },
      cantidad: certificados.length,
      certificados,
    };
  }

  // Consulta blockchain-service; null si no está disponible o hay error.
  private async verificarOnChain(certHash: string) {
    const base = process.env.BLOCKCHAIN_SERVICE_URL || 'http://localhost:6000';
    try {
      const control = new AbortController();
      const timeout = setTimeout(() => control.abort(), 5000);
      const res = await fetch(`${base}/verifyCertificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certHash }),
        signal: control.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.ok) return null;
      return {
        exists: Boolean(data.exists),
        isRevoked: Boolean(data.isRevoked),
        valid: Boolean(data.valid),
        issuer: data.issuer ?? null,
      };
    } catch {
      return null;
    }
  }
}
