// backend/src/auth/supabase-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface UsuarioContext {
  id: number;
  authUserId: string;
  rol: string | null;
  institucionId: number | null;
  nombre: string | null;
}

// Valida el JWT de Supabase y adjunta el usuario de la plataforma (tabla
// `usuarios`, vinculada por auth_user_id). Si tiene institución, adjunta
// también request.institucion = { institucion_id, nombre }.
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de autenticación.');
    }

    const token = authHeader.slice('Bearer '.length);
    const { data, error } = await this.supabase.client.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    const { data: usuario, error: usuarioError } = await this.supabase.client
      .from('usuarios')
      .select('id, auth_user_id, rol, institucion_id, nombre')
      .eq('auth_user_id', data.user.id)
      .single();

    if (usuarioError || !usuario) {
      throw new UnauthorizedException('Este usuario no tiene acceso a la plataforma.');
    }

    const ctx: UsuarioContext = {
      id: usuario.id,
      authUserId: data.user.id,
      rol: usuario.rol,
      institucionId: usuario.institucion_id,
      nombre: usuario.nombre,
    };
    request.usuario = ctx;

    if (ctx.institucionId != null) {
      const { data: institucion, error: institucionError } = await this.supabase.client
        .from('instituciones')
        .select('institucion_id, nombre')
        .eq('institucion_id', ctx.institucionId)
        .single();

      if (!institucionError && institucion) {
        request.institucion = {
          institucion_id: institucion.institucion_id,
          nombre: institucion.nombre,
        };
      }
    }

    return true;
  }
}
