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
    const texto = await this.ocr.extraerTexto(pdfBuffer);
    const datos = this.ocr.parsearCampos(texto);
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
      'id_certificado, codigo, nombre_estudiante, carrera, fecha_titulacion, hash_certificado, estado, fecha_creacion, institucion_id, instituciones(institucion_id, nombre, wallet_address)',
    );

  query = params.hash ? query.eq('hash_certificado', params.hash) : query.eq('codigo', params.codigo!);

  const { data } = await query.maybeSingle();

  if (!data) return { valido: false };

  const institucion = (data as any).instituciones;

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
      institucionWallet: institucion?.wallet_address ?? null,
      rfid: null,
    },
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