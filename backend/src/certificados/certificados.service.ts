// backend/src/certificados/certificados.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { SubidaCacheService } from './subida-cache.service';
import { OcrService } from './ocr.service';

@Injectable()
export class CertificadosService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: SubidaCacheService,
    private readonly ocr: OcrService,
  ) {}

  async procesar(pdfBuffer: Buffer, archivoNombre: string, institucionId: number) {
  // CAMBIO: Usa parsearCamposConRegiones directamente
  const datos = await this.ocr.parsearCamposConRegiones(pdfBuffer, institucionId);
  const hash = this.generarHash(pdfBuffer);
  const subidaId = this.cache.guardar(hash, institucionId);

  return {
    subidaId,
    hash,
    nombreEstudiante: datos.nombreEstudiante,
    carrera: datos.carrera,
    fechaEmision: datos.fechaEmision,
    archivoNombre,
  };
}

  async confirmar(
    datos: {
      subidaId: string;
      hash: string;
      txHash?: string;
      nombreEstudiante: string;
      carrera: string;
      fechaEmision: string;
      archivoNombre: string;
    },
    institucion: { institucion_id: number; nombre: string },
  ) {
    const pendiente = this.cache.obtener(datos.subidaId, institucion.institucion_id);
    if (!pendiente) {
      throw new BadRequestException('La subida expiró o no es válida. Vuelve a subir el archivo.');
    }
    if (pendiente.hash !== datos.hash) {
      throw new BadRequestException('El hash no coincide con la subida original.');
    }

    const codigo = await this.generarCodigo(institucion.nombre, datos.fechaEmision, datos.carrera);

    const { data, error } = await this.supabase.client
      .from('certificados')
      .insert({
        nombre_estudiante: datos.nombreEstudiante,
        carrera: datos.carrera,
        fecha_titulacion: datos.fechaEmision,
        hash_certificado: datos.hash,
        //Este tx_hash no sé que hacía aquí :S
        //tx_hash: datos.txHash ?? null,
        codigo,
        estado: 'registrado',
        institucion_id: institucion.institucion_id,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`No se pudo registrar el certificado: ${error.message}`);

    this.cache.eliminar(datos.subidaId);

    return {
      id: String(data.id_certificado),
      codigo: data.codigo,
      nombreEstudiante: data.nombre_estudiante,
      carrera: data.carrera,
      fechaEmision: data.fecha_titulacion,
      institucion: institucion.nombre,
      hash: data.hash_certificado,
      rfid: null,
      estado: data.estado,
    };
  }

  async recientes(institucionId: number) {
    const { data, error } = await this.supabase.client
      .from('certificados')
      .select('codigo, nombre_estudiante, fecha_creacion')
      .eq('institucion_id', institucionId)
      .order('fecha_creacion', { ascending: false })
      .limit(5);

    if (error) throw new BadRequestException(error.message);

    return (data ?? []).map((c) => ({
      codigo: c.codigo,
      nombreEstudiante: c.nombre_estudiante,
      fecha: new Date(c.fecha_creacion).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    }));
  }

  async estadisticas(institucionId: number) {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const [{ count: total }, { count: esteMes }] = await Promise.all([
      this.supabase.client
        .from('certificados')
        .select('*', { count: 'exact', head: true })
        .eq('institucion_id', institucionId),
      this.supabase.client
        .from('certificados')
        .select('*', { count: 'exact', head: true })
        .eq('institucion_id', institucionId)
        .gte('fecha_creacion', inicioMes.toISOString()),
    ]);

    return { total: total ?? 0, esteMes: esteMes ?? 0, pendientes: 0 };
  }

  async obtenerMetadataPorHash(params: { codigo?: string; hash?: string }) {
  if (!params.codigo && !params.hash) {
    throw new BadRequestException('Debes proporcionar codigo o hash.');
  }

  let query = this.supabase.client
    .from('certificados')
    .select(
      'id_certificado, codigo, nombre_estudiante, carrera, fecha_titulacion, hash_certificado, estado, fecha_creacion, institucion_id',
    );

  query = params.hash ? query.eq('hash_certificado', params.hash) : query.eq('codigo', params.codigo!);

  const { data } = await query.maybeSingle();

  if (!data) return { valido: false };

  const institucion = await this.obtenerNombreYWallet(data.institucion_id);

  return {
    valido: true,
    certificado: {
      id: String(data.id_certificado),
      codigo: data.codigo,
      nombreEstudiante: data.nombre_estudiante,
      carrera: data.carrera,
      fechaEmision: data.fecha_titulacion,
      fechaCreacion: data.fecha_creacion,
      hash: data.hash_certificado,
      estado: data.estado,
      institucionId: data.institucion_id,
      institucion: institucion?.nombre ?? null,
      institucionWallet: institucion?.address ?? null,
      rfid: null,
    },
  };
}

  // Lista los certificados de una institución (para su panel).
  async listarDeInstitucion(institucionId: number, filtro?: { q?: string; estado?: string }) {
    let query = this.supabase.client
      .from('certificados')
      .select(
        'id_certificado, codigo, nombre_estudiante, carrera, fecha_titulacion, fecha_creacion, hash_certificado, estado, institucion_id',
      )
      .eq('institucion_id', institucionId)
      .order('fecha_creacion', { ascending: false });

    if (filtro?.estado) query = query.eq('estado', filtro.estado);
    if (filtro?.q) {
      query = query.or(`nombre_estudiante.ilike.%${filtro.q}%,carrera.ilike.%${filtro.q}%,codigo.ilike.%${filtro.q}%`);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);

    const institucion = await this.obtenerNombreYWallet(institucionId);

    return (data ?? []).map((c) => this.mapearCertificado(c, institucion?.nombre ?? null, institucion?.address ?? null));
  }

  // Detalle de un certificado propio (scoped por institución).
  async detalleDeInstitucion(id: number, institucionId: number) {
    const { data, error } = await this.supabase.client
      .from('certificados')
      .select(
        'id_certificado, codigo, nombre_estudiante, carrera, fecha_titulacion, fecha_creacion, hash_certificado, estado, institucion_id',
      )
      .eq('id_certificado', id)
      .eq('institucion_id', institucionId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new BadRequestException('Certificado no encontrado.');

    const institucion = await this.obtenerNombreYWallet(institucionId);
    return this.mapearCertificado(data, institucion?.nombre ?? null, institucion?.address ?? null);
  }

  // Marca como revocado un certificado propio (el cliente ya lo revocó on-chain).
  async revocarCertificado(id: number, institucionId: number) {
    const { data, error } = await this.supabase.client
      .from('certificados')
      .update({ estado: 'revocado' })
      .eq('id_certificado', id)
      .eq('institucion_id', institucionId)
      .select(
        'id_certificado, codigo, nombre_estudiante, carrera, fecha_titulacion, fecha_creacion, hash_certificado, estado, institucion_id',
      )
      .maybeSingle();

    if (error || !data) throw new BadRequestException('No se pudo revocar el certificado.');
    const institucion = await this.obtenerNombreYWallet(institucionId);
    return this.mapearCertificado(data, institucion?.nombre ?? null, institucion?.address ?? null);
  }

  // Edita la metadata off-chain de un certificado propio (scoped por institución).
  async editarDeInstitucion(
    id: number,
    institucionId: number,
    cambios: { nombreEstudiante?: string; carrera?: string; fechaEmision?: string },
  ) {
    const fila: Record<string, unknown> = {};
    if (cambios.nombreEstudiante !== undefined) fila.nombre_estudiante = cambios.nombreEstudiante?.trim() || null;
    if (cambios.carrera !== undefined) fila.carrera = cambios.carrera?.trim() || null;
    if (cambios.fechaEmision !== undefined) fila.fecha_titulacion = cambios.fechaEmision || null;

    if (Object.keys(fila).length === 0) throw new BadRequestException('No hay campos para actualizar.');

    const { data, error } = await this.supabase.client
      .from('certificados')
      .update(fila)
      .eq('id_certificado', id)
      .eq('institucion_id', institucionId)
      .select(
        'id_certificado, codigo, nombre_estudiante, carrera, fecha_titulacion, fecha_creacion, hash_certificado, estado, institucion_id',
      )
      .maybeSingle();

    if (error || !data) throw new BadRequestException('Certificado no encontrado.');
    const institucion = await this.obtenerNombreYWallet(institucionId);
    return this.mapearCertificado(data, institucion?.nombre ?? null, institucion?.address ?? null);
  }

  // Público: tarjeta RFID -> credencial + sus certificados.
  async porRfid(uid: string) {
    const { data: credencial } = await this.supabase.client
      .from('credenciales_fisicas')
      .select('id, uid_rfid, codigo, fecha_emision_fisica')
      .eq('uid_rfid', uid)
      .maybeSingle();

    if (!credencial) return { valido: false, mensaje: 'No se encontró ninguna tarjeta con ese UID.' };

    const { data: vinculos } = await this.supabase.client
      .from('certificados_credenciales')
      .select('certificados_id')
      .eq('credenciales_fisicas_id', credencial.id);

    const ids = (vinculos ?? []).map((v) => v.certificados_id);
    let certificados: any[] = [];

    if (ids.length > 0) {
      const { data: datos } = await this.supabase.client
        .from('certificados')
        .select(
          'id_certificado, codigo, nombre_estudiante, carrera, fecha_titulacion, fecha_creacion, hash_certificado, estado, institucion_id',
        )
        .in('id_certificado', ids);

      const instIds = [...new Set((datos ?? []).map((c) => c.institucion_id))];
      const instMap = await this.obtenerNombresWallets(instIds);
      certificados = (datos ?? []).map((c) =>
        this.mapearCertificado(c, instMap.get(c.institucion_id)?.nombre ?? null, instMap.get(c.institucion_id)?.address ?? null),
      );
    }

    return {
      valido: true,
      credencial: {
        id: String(credencial.id),
        uid: credencial.uid_rfid,
        codigo: credencial.codigo,
        fechaEmisionFisica: credencial.fecha_emision_fisica,
      },
      certificados,
    };
  }

  async verificar(codigo: string) {
    const { data } = await this.supabase.client
      .from('certificados')
      .select('id_certificado, codigo, nombre_estudiante, carrera, fecha_titulacion, hash_certificado, estado, instituciones(nombre)')
      .eq('codigo', codigo)
      .maybeSingle();

    if (!data) return { valido: false };

    return {
      valido: true,
      certificado: {
        id: String(data.id_certificado),
        codigo: data.codigo,
        nombreEstudiante: data.nombre_estudiante,
        carrera: data.carrera,
        fechaEmision: data.fecha_titulacion,
        institucion: (data as any).instituciones?.nombre ?? '',
        hash: data.hash_certificado,
        rfid: null,
        estado: data.estado,
      },
    };
  }

  // ---------- helpers ----------

  private mapearCertificado(
    c: any,
    institucion: string | null,
    institucionWallet: string | null,
  ) {
    return {
      id: String(c.id_certificado),
      codigo: c.codigo,
      nombreEstudiante: c.nombre_estudiante,
      carrera: c.carrera,
      fechaEmision: c.fecha_titulacion,
      fechaCreacion: c.fecha_creacion,
      hash: c.hash_certificado,
      estado: c.estado,
      institucionId: c.institucion_id,
      institucion,
      institucionWallet,
      rfid: null,
    };
  }

  private async obtenerNombreYWallet(institucionId: number) {
    const mapa = await this.obtenerNombresWallets([institucionId]);
    return mapa.get(institucionId) ?? null;
  }

  private async obtenerNombresWallets(institucionIds: number[]): Promise<Map<number, { nombre: string; address: string | null }>> {
    const mapa = new Map<number, { nombre: string; address: string | null }>();
    if (institucionIds.length === 0) return mapa;

    const { data: instituciones } = await this.supabase.client
      .from('instituciones')
      .select('institucion_id, nombre')
      .in('institucion_id', institucionIds);

    const { data: wallets } = await this.supabase.client
      .from('institucion_wallets')
      .select('institucion_id, address')
      .in('institucion_id', institucionIds);

    for (const i of instituciones ?? []) {
      mapa.set(i.institucion_id, {
        nombre: i.nombre,
        address: (wallets ?? []).find((w) => w.institucion_id === i.institucion_id)?.address ?? null,
      });
    }
    return mapa;
  }

  private generarHash(pdfBuffer: Buffer): string {
    return '0x' + createHash('sha256').update(pdfBuffer).digest('hex');
  }

  private async generarCodigo(institucionNombre: string, fecha: string, carrera: string): Promise<string> {
    const siglas = institucionNombre
      .split(/\s+/)
      .filter((p) => p.length > 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 4) || 'CERT';

    const anio = fecha?.slice(0, 4) || String(new Date().getFullYear());
    const carreraSiglas = carrera.split(/\s+/).map((p) => p[0]).join('').toUpperCase().slice(0, 4) || 'GEN';
    const secuencia = String(Math.floor(1000 + Math.random() * 9000));

    return `${siglas}-${anio}-${secuencia}-${carreraSiglas}`;
  }
}