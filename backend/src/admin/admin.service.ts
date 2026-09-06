// backend/src/admin/admin.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AdminService {
  constructor(private readonly supabase: SupabaseService) {}

  // ──────────────────────────────────────────── Instituciones ─────────────

  async listarInstituciones() {
    const { data: instituciones, error } = await this.supabase.client
      .from('instituciones')
      .select('institucion_id, nombre')
      .order('nombre');

    if (error) throw new BadRequestException(error.message);

    const wallets = await this.walletsPorInstitucion((instituciones ?? []).map((i) => i.institucion_id));

    return (instituciones ?? []).map((i) => ({
      institucion_id: i.institucion_id,
      nombre: i.nombre,
      wallet_address: wallets.get(i.institucion_id) ?? null,
    }));
  }

  async crearInstitucion(nombre: string) {
    if (!nombre?.trim()) throw new BadRequestException('El nombre es obligatorio.');
    const { data, error } = await this.supabase.client
      .from('instituciones')
      .insert({ nombre: nombre.trim() })
      .select('institucion_id, nombre')
      .single();
    if (error) throw new BadRequestException(`No se pudo crear la institución: ${error.message}`);
    return { institucion_id: data.institucion_id, nombre: data.nombre, wallet_address: null };
  }

  async detalleInstitucion(id: number) {
    const { data: institucion, error } = await this.supabase.client
      .from('instituciones')
      .select('institucion_id, nombre')
      .eq('institucion_id', id)
      .single();
    if (error || !institucion) throw new BadRequestException('Institución no encontrada.');

    const { count } = await this.supabase.client
      .from('certificados')
      .select('*', { count: 'exact', head: true })
      .eq('institucion_id', id);

    const wallets = await this.listarWalletsInstitucion(id);

    return {
      institucion_id: institucion.institucion_id,
      nombre: institucion.nombre,
      wallet_address: wallets[0]?.address ?? null,
      cantCertificados: count ?? 0,
    };
  }

  async eliminarInstitucion(id: number) {
    const { count } = await this.supabase.client
      .from('certificados')
      .select('*', { count: 'exact', head: true })
      .eq('institucion_id', id);
    if ((count ?? 0) > 0) {
      throw new BadRequestException('No se puede eliminar: la institución tiene certificados.');
    }

    await this.supabase.client.from('institucion_wallets').delete().eq('institucion_id', id);
    const { error } = await this.supabase.client.from('instituciones').delete().eq('institucion_id', id);
    if (error) throw new BadRequestException(error.message);
    return { ok: true };
  }

  // ──────────────────────────────────────────── Wallets ───────────────────

  async listarWalletsInstitucion(institucionId: number) {
    const { data, error } = await this.supabase.client
      .from('institucion_wallets')
      .select('wallet_id, institucion_id, address, etiqueta')
      .eq('institucion_id', institucionId)
      .order('wallet_id');

    if (error) throw new BadRequestException(error.message);
    return (data ?? []).map((w) => ({
      wallet_id: w.wallet_id,
      institucion_id: w.institucion_id,
      address: w.address,
      etiqueta: w.etiqueta ?? null,
    }));
  }

  async agregarWalletInstitucion(institucionId: number, datos: { address: string; etiqueta?: string }) {
    if (!datos.address?.trim()) throw new BadRequestException('La dirección es obligatoria.');
    const { data, error } = await this.supabase.client
      .from('institucion_wallets')
      .insert({ institucion_id: institucionId, address: datos.address.trim(), etiqueta: datos.etiqueta ?? null })
      .select('wallet_id, institucion_id, address, etiqueta')
      .single();
    if (error) throw new BadRequestException(`No se pudo agregar la wallet: ${error.message}`);
    return {
      wallet_id: data.wallet_id,
      institucion_id: data.institucion_id,
      address: data.address,
      etiqueta: data.etiqueta ?? null,
    };
  }

  async eliminarWalletInstitucion(institucionId: number, walletId: number) {
    const { error } = await this.supabase.client
      .from('institucion_wallets')
      .delete()
      .eq('wallet_id', walletId)
      .eq('institucion_id', institucionId);
    if (error) throw new BadRequestException(error.message);
    return { ok: true };
  }

  // ──────────────────────────────────────────── Certificados (admin) ───────

  async listarCertificadosAdmin(filtro?: { institucionId?: number; estado?: string; q?: string }) {
    let query = this.supabase.client
      .from('certificados')
      .select(
        'id_certificado, codigo, nombre_estudiante, carrera, fecha_titulacion, fecha_creacion, hash_certificado, estado, institucion_id',
      )
      .order('fecha_creacion', { ascending: false });

    if (filtro?.institucionId) query = query.eq('institucion_id', filtro.institucionId);
    if (filtro?.estado) query = query.eq('estado', filtro.estado);
    if (filtro?.q) {
      query = query.or(`nombre_estudiante.ilike.%${filtro.q}%,codigo.ilike.%${filtro.q}%,carrera.ilike.%${filtro.q}%`);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);

    const instIds = [...new Set((data ?? []).map((c) => c.institucion_id))];
    const nombres = await this.nombresInstituciones(instIds);

    return (data ?? []).map((c) => ({
      id: String(c.id_certificado),
      codigo: c.codigo,
      nombreEstudiante: c.nombre_estudiante,
      carrera: c.carrera,
      fechaEmision: c.fecha_titulacion,
      institucion: nombres.get(c.institucion_id) ?? null,
      hash: c.hash_certificado,
      rfid: null,
      estado: c.estado,
    }));
  }

  // Edita metadata de un certificado (nombre estudiante, carrera, fecha).
  // Solo datos off-chain: el hash del documento (y su registro on-chain) no cambia.
  async actualizarCertificado(
    certId: number,
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
      .eq('id_certificado', certId)
      .select('id_certificado, codigo, nombre_estudiante, carrera, fecha_titulacion, fecha_creacion, hash_certificado, estado, institucion_id')
      .single();
    if (error || !data) throw new BadRequestException('Certificado no encontrado o no se pudo actualizar.');

    const nombres = await this.nombresInstituciones([data.institucion_id]);
    return {
      id: String(data.id_certificado),
      codigo: data.codigo,
      nombreEstudiante: data.nombre_estudiante,
      carrera: data.carrera,
      fechaEmision: data.fecha_titulacion,
      institucion: nombres.get(data.institucion_id) ?? null,
      hash: data.hash_certificado,
      rfid: null,
      estado: data.estado,
    };
  }

  // ──────────────────────────────────────────── Credenciales / tarjetas ────

  // Obtiene o crea la credencial física por su UID y la vincula al certificado.
  async vincularCredencial(certId: number, uid: string) {
    if (!uid?.trim()) throw new BadRequestException('El UID de la tarjeta es obligatorio.');

    const { data: certificado } = await this.supabase.client
      .from('certificados')
      .select('id_certificado')
      .eq('id_certificado', certId)
      .maybeSingle();
    if (!certificado) throw new BadRequestException('Certificado no encontrado.');

    const { data: existente } = await this.supabase.client
      .from('credenciales_fisicas')
      .select('id, uid_rfid, codigo')
      .eq('uid_rfid', uid.trim())
      .maybeSingle();

    let credencial = existente;
    if (!credencial) {
      const { data: nueva, error } = await this.supabase.client
        .from('credenciales_fisicas')
        .insert({ uid_rfid: uid.trim(), codigo: null, fecha_emision_fisica: new Date().toISOString() })
        .select('id, uid_rfid, codigo')
        .single();
      if (error) throw new BadRequestException(`No se pudo registrar la tarjeta: ${error.message}`);
      credencial = nueva;
    }

    const { error: vinculoError } = await this.supabase.client
      .from('certificados_credenciales')
      .insert({ credenciales_fisicas_id: credencial.id, certificados_id: certId });
    // El PK es certificados_id: si ya estaba vinculado, el insert choca (idempotente).
    if (vinculoError && (vinculoError as any).code !== '23505') {
      throw new BadRequestException(`No se pudo vincular la tarjeta: ${vinculoError.message}`);
    }

    return {
      credencial_id: credencial.id,
      uid_rfid: credencial.uid_rfid,
      etiqueta: credencial.codigo ?? null,
    };
  }

  async desvincularCredencial(certId: number, credencialId: number) {
    const { error } = await this.supabase.client
      .from('certificados_credenciales')
      .delete()
      .eq('certificados_id', certId)
      .eq('credenciales_fisicas_id', credencialId);
    if (error) throw new BadRequestException(error.message);
    return { ok: true };
  }

  // Crea una credencial física nueva (UID obligatorio y sin duplicados).
  async crearCredencial(datos: { uidRfid: string; codigo?: string; fechaEmisionFisica?: string }) {
    const uid = datos.uidRfid?.trim();
    if (!uid) throw new BadRequestException('El UID de la credencial es obligatorio.');

    const { data: duplicada } = await this.supabase.client
      .from('credenciales_fisicas')
      .select('id')
      .eq('uid_rfid', uid)
      .maybeSingle();
    if (duplicada) throw new BadRequestException('Ya existe una credencial con ese UID.');

    const { data, error } = await this.supabase.client
      .from('credenciales_fisicas')
      .insert({
        uid_rfid: uid,
        codigo: datos.codigo?.trim() || null,
        fecha_emision_fisica: datos.fechaEmisionFisica || new Date().toISOString(),
      })
      .select('id, uid_rfid, codigo, fecha_emision_fisica')
      .single();
    if (error) throw new BadRequestException(`No se pudo registrar la credencial: ${error.message}`);

    return this.armarCredencial(data, [], new Map());
  }

  async listarCredenciales() {
    const { data: credenciales, error } = await this.supabase.client
      .from('credenciales_fisicas')
      .select('id, uid_rfid, codigo, fecha_emision_fisica')
      .order('fecha_emision_fisica', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    const vinculos = await this.vinculosDeMuchas((credenciales ?? []).map((c) => c.id));
    const certMap = await this.certificadosConInstitucion(vinculos.certIds);

    return (credenciales ?? []).map((c) =>
      this.armarCredencial(c, vinculos.porCredencial.get(c.id) ?? [], certMap),
    );
  }

  async detalleCredencial(credencialId: number) {
    const { data: credencial, error } = await this.supabase.client
      .from('credenciales_fisicas')
      .select('id, uid_rfid, codigo, fecha_emision_fisica')
      .eq('id', credencialId)
      .maybeSingle();
    if (error || !credencial) throw new BadRequestException('Credencial física no encontrada.');

    const certIds = await this.vinculadosIds(credencialId);
    const certMap = await this.certificadosConInstitucion(certIds);
    return this.armarCredencial(credencial, certIds, certMap);
  }

  // Edita los campos editables de una credencial física (menos su id).
  async actualizarCredencial(
    credencialId: number,
    cambios: { uidRfid?: string; codigo?: string; fechaEmisionFisica?: string },
  ) {
    const fila: Record<string, unknown> = {};
    if (cambios.uidRfid !== undefined) {
      if (!cambios.uidRfid?.trim()) throw new BadRequestException('El UID es obligatorio.');
      fila.uid_rfid = cambios.uidRfid.trim();
    }
    if (cambios.codigo !== undefined) fila.codigo = cambios.codigo?.trim() || null;
    if (cambios.fechaEmisionFisica !== undefined) fila.fecha_emision_fisica = cambios.fechaEmisionFisica || null;

    if (Object.keys(fila).length === 0) throw new BadRequestException('No hay campos para actualizar.');

    const { data, error } = await this.supabase.client
      .from('credenciales_fisicas')
      .update(fila)
      .eq('id', credencialId)
      .select('id, uid_rfid, codigo, fecha_emision_fisica')
      .maybeSingle();
    if (error || !data) {
      const mensaje = (error as any)?.code === '23505' ? 'El UID ya pertenece a otra credencial.' : 'Credencial no encontrada.';
      throw new BadRequestException(mensaje);
    }

    const certIds = await this.vinculadosIds(credencialId);
    const certMap = await this.certificadosConInstitucion(certIds);
    return this.armarCredencial(data, certIds, certMap);
  }

  // Vincula un certificado (ya existente) a una credencial física.
  async vincularCertificadoAcredencial(credencialId: number, certificadoId: number) {
    const { data: credencial } = await this.supabase.client
      .from('credenciales_fisicas')
      .select('id')
      .eq('id', credencialId)
      .maybeSingle();
    if (!credencial) throw new BadRequestException('Credencial física no encontrada.');

    const { data: certificado } = await this.supabase.client
      .from('certificados')
      .select('id_certificado')
      .eq('id_certificado', certificadoId)
      .maybeSingle();
    if (!certificado) throw new BadRequestException('Certificado no encontrado.');

    const { error } = await this.supabase.client
      .from('certificados_credenciales')
      .insert({ credenciales_fisicas_id: credencialId, certificados_id: certificadoId });
    if (error) {
      const mensaje =
        (error as any).code === '23505'
          ? 'Ese certificado ya está vinculado a una credencial física.'
          : `No se pudo vincular: ${error.message}`;
      throw new BadRequestException(mensaje);
    }
    return { ok: true };
  }

  async desvincularCertificadoDeCredencial(credencialId: number, certificadoId: number) {
    const { error } = await this.supabase.client
      .from('certificados_credenciales')
      .delete()
      .eq('credenciales_fisicas_id', credencialId)
      .eq('certificados_id', certificadoId);
    if (error) throw new BadRequestException(error.message);
    return { ok: true };
  }

  // ---------- helpers de credenciales ----------

  private async vinculadosIds(credencialId: number): Promise<number[]> {
    const { data } = await this.supabase.client
      .from('certificados_credenciales')
      .select('certificados_id')
      .eq('credenciales_fisicas_id', credencialId);
    return (data ?? []).map((v) => v.certificados_id);
  }

  private async vinculosDeMuchas(credencialIds: number[]) {
    const porCredencial = new Map<number, number[]>();
    const certIds: number[] = [];
    if (credencialIds.length > 0) {
      const { data } = await this.supabase.client
        .from('certificados_credenciales')
        .select('credenciales_fisicas_id, certificados_id')
        .in('credenciales_fisicas_id', credencialIds);
      for (const v of data ?? []) {
        const lista = porCredencial.get(v.credenciales_fisicas_id) ?? [];
        lista.push(v.certificados_id);
        porCredencial.set(v.credenciales_fisicas_id, lista);
        certIds.push(v.certificados_id);
      }
    }
    return { porCredencial, certIds };
  }

  private armarCredencial(c: any, certIds: number[], certMap: Map<number, any>) {
    const vinculados = certIds.map((id) => certMap.get(id)).filter(Boolean) as any[];
    return {
      credencial_id: c.id,
      uid_rfid: c.uid_rfid,
      codigo: c.codigo ?? null,
      fechaEmisionFisica: c.fecha_emision_fisica ?? null,
      institucion: vinculados[0]?.institucion ?? null,
      certificados: vinculados,
    };
  }

  // ──────────────────────────────────────────── Usuarios ───────────────────

  async listarUsuarios(institucionId?: number) {
    let query = this.supabase.client.from('usuarios').select('id, auth_user_id, rol, institucion_id, nombre, created_at');
    if (institucionId) query = query.eq('institucion_id', institucionId);
    query = query.order('created_at', { ascending: false });

    const { data: usuarios, error } = await query;
    if (error) throw new BadRequestException(error.message);

    const emails = await this.mapaEmailsAuth();

    return (usuarios ?? []).map((u) => ({
      usuario_id: String(u.id),
      nombre: u.nombre ?? emails.get(u.auth_user_id) ?? '—',
      email: emails.get(u.auth_user_id) ?? '',
      rol: u.rol,
      institucion_id: u.institucion_id,
    }));
  }

  async crearUsuario(datos: { email: string; password: string; nombre: string; rol: string; institucionId?: number | null }) {
    const rolesValidos = ['admin', 'institucional'];
    if (!rolesValidos.includes(datos.rol)) throw new BadRequestException('Rol inválido.');
    if (datos.rol === 'institucional' && !datos.institucionId) {
      throw new BadRequestException('Un usuario institucional debe pertenecer a una institución.');
    }
    if (!datos.email?.trim() || !datos.password?.trim()) {
      throw new BadRequestException('Email y contraseña son obligatorios.');
    }

    const { data: auth, error: authError } = await this.supabase.client.auth.admin.createUser({
      email: datos.email.trim(),
      password: datos.password,
      email_confirm: true,
      // El rol en app_metadata lo lee el middleware del frontend (JWT) sin tocar la DB.
      app_metadata: { rol: datos.rol },
    });
    if (authError) throw new BadRequestException(`No se pudo crear el usuario: ${authError.message}`);

    const { data, error } = await this.supabase.client
      .from('usuarios')
      .insert({
        auth_user_id: auth.user.id,
        nombre: datos.nombre?.trim() || null,
        rol: datos.rol,
        institucion_id: datos.institucionId ?? null,
      })
      .select('id, auth_user_id, rol, institucion_id, nombre')
      .single();

    if (error) {
      await this.supabase.client.auth.admin.deleteUser(auth.user.id).catch(() => undefined);
      throw new BadRequestException(`No se pudo guardar el usuario: ${error.message}`);
    }

    return {
      usuario_id: String(data.id),
      nombre: data.nombre ?? datos.email.trim(),
      email: datos.email.trim(),
      rol: data.rol,
      institucion_id: data.institucion_id,
    };
  }

  // Acepta usuarios.id (número) o auth_user_id (uuid).
  async eliminarUsuario(referencia: string) {
    const usuario = await this.buscarUsuarioPorReferencia(referencia);
    if (!usuario) throw new BadRequestException('Usuario no encontrado.');

    await this.supabase.client.from('usuarios').delete().eq('id', usuario.id);
    const { error: authError } = await this.supabase.client.auth.admin.deleteUser(usuario.auth_user_id);
    if (authError) throw new BadRequestException(`No se pudo eliminar de Supabase: ${authError.message}`);
    return { ok: true };
  }

  // Edita campos del usuario: nombre, email, contraseña, rol e institución.
  // Mantiene sincronizado el rol en app_metadata (lo usa el middleware del frontend).
  async actualizarUsuario(
    referencia: string,
    cambios: { nombre?: string; email?: string; password?: string; rol?: string; institucionId?: number | null },
  ) {
    const usuario = await this.buscarUsuarioPorReferencia(referencia);
    if (!usuario) throw new BadRequestException('Usuario no encontrado.');

    const rolesValidos = ['admin', 'institucional'];
    const rolFinal = cambios.rol ?? usuario.rol ?? 'institucional';
    if (!rolesValidos.includes(rolFinal)) throw new BadRequestException('Rol inválido.');

    const institucionFinal =
      cambios.institucionId !== undefined ? cambios.institucionId : usuario.institucion_id;
    if (rolFinal === 'institucional' && institucionFinal == null) {
      throw new BadRequestException('Un usuario institucional debe pertenecer a una institución.');
    }

    // 1) Actualiza auth (email/contraseña + app_metadata con el rol).
    const { data: authActual, error: getError } = await this.supabase.client.auth.admin.getUserById(
      usuario.auth_user_id,
    );
    if (getError || !authActual?.user) {
      throw new BadRequestException(`No se encontró el usuario en Supabase: ${getError?.message}`);
    }

    const updates: Record<string, unknown> = {
      app_metadata: { ...(authActual.user.app_metadata ?? {}), rol: rolFinal },
    };
    if (cambios.email?.trim()) updates.email = cambios.email.trim();
    if (cambios.password?.trim()) updates.password = cambios.password;
    updates.email_confirm = true;

    const { error: authError } = await this.supabase.client.auth.admin.updateUserById(
      usuario.auth_user_id,
      updates,
    );
    if (authError) throw new BadRequestException(`No se pudo actualizar en Supabase: ${authError.message}`);

    // 2) Actualiza la fila en usuarios.
    const fila: Record<string, unknown> = { rol: rolFinal, institucion_id: institucionFinal };
    if (cambios.nombre !== undefined) fila.nombre = cambios.nombre?.trim() || null;

    const { data, error } = await this.supabase.client
      .from('usuarios')
      .update(fila)
      .eq('id', usuario.id)
      .select('id, auth_user_id, rol, institucion_id, nombre')
      .single();
    if (error) throw new BadRequestException(`No se pudo guardar el usuario: ${error.message}`);

    return {
      usuario_id: String(data.id),
      nombre: data.nombre ?? cambios.email?.trim() ?? authActual.user.email ?? '—',
      email: cambios.email?.trim() ?? authActual.user.email ?? '',
      rol: data.rol,
      institucion_id: data.institucion_id,
    };
  }

  private async buscarUsuarioPorReferencia(referencia: string) {
    const porAuth = await this.supabase.client
      .from('usuarios')
      .select('id, auth_user_id, rol, institucion_id, nombre')
      .eq('auth_user_id', referencia)
      .maybeSingle();

    if (porAuth.data) return porAuth.data;

    if (/^\d+$/.test(referencia)) {
      const porId = await this.supabase.client
        .from('usuarios')
        .select('id, auth_user_id, rol, institucion_id, nombre')
        .eq('id', Number(referencia))
        .maybeSingle();
      if (porId.data) return porId.data;
    }
    return null;
  }

  // ──────────────────────────────────────────── Helpers ────────────────────

  private async walletsPorInstitucion(institucionIds: number[]): Promise<Map<number, string | null>> {
    const mapa = new Map<number, string | null>();
    if (institucionIds.length === 0) return mapa;
    const { data } = await this.supabase.client
      .from('institucion_wallets')
      .select('institucion_id, address');
    // primer wallet por institución
    const vistos = new Set<number>();
    for (const w of data ?? []) {
      if (!vistos.has(w.institucion_id)) {
        mapa.set(w.institucion_id, w.address);
        vistos.add(w.institucion_id);
      }
    }
    return mapa;
  }

  private async nombresInstituciones(institucionIds: number[]): Promise<Map<number, string>> {
    const mapa = new Map<number, string>();
    if (institucionIds.length === 0) return mapa;
    const { data } = await this.supabase.client
      .from('instituciones')
      .select('institucion_id, nombre')
      .in('institucion_id', institucionIds);
    for (const i of data ?? []) mapa.set(i.institucion_id, i.nombre);
    return mapa;
  }

  // certificados (con nombre de institución) indexados por id_certificado
  private async certificadosConInstitucion(certIds: number[]): Promise<Map<number, any>> {
    const mapa = new Map<number, any>();
    if (certIds.length === 0) return mapa;

    const { data } = await this.supabase.client
      .from('certificados')
      .select(
        'id_certificado, codigo, nombre_estudiante, carrera, fecha_titulacion, hash_certificado, estado, institucion_id',
      )
      .in('id_certificado', certIds);

    const instIds = [...new Set((data ?? []).map((c) => c.institucion_id))];
    const nombres = await this.nombresInstituciones(instIds);

    for (const c of data ?? []) {
      mapa.set(c.id_certificado, {
        id: String(c.id_certificado),
        codigo: c.codigo,
        nombreEstudiante: c.nombre_estudiante,
        carrera: c.carrera,
        fechaEmision: c.fecha_titulacion,
        institucion: nombres.get(c.institucion_id) ?? null,
        hash: c.hash_certificado,
        estado: c.estado,
      });
    }
    return mapa;
  }

  private async mapaEmailsAuth(): Promise<Map<string, string>> {
    const mapa = new Map<string, string>();
    try {
      const { data } = await this.supabase.client.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const u of data.users ?? []) mapa.set(u.id, u.email ?? '');
    } catch {
      // sin clave admin no se resuelven emails
    }
    return mapa;
  }
}
