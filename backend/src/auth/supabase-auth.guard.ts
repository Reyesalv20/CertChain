// backend/src/auth/supabase-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

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

    console.log('DEBUG guard -> error de getUser:', error);
    console.log('DEBUG guard -> data.user:', data?.user);

    if (error || !data.user) {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    // Busca la institución vinculada a este usuario de Supabase
    const { data: institucion, error: institucionError } = await this.supabase.client
      .from('instituciones')
      .select('institucion_id, nombre, wallet_address')
      .eq('auth_user_id', data.user.id)
      .single();

    console.log('DEBUG guard -> institucion encontrada:', institucion);
    console.log('DEBUG guard -> institucionError:', institucionError);

    if (institucionError || !institucion) {
      throw new UnauthorizedException('Este usuario no está vinculado a ninguna institución.');
    }

    request.institucion = institucion;
    return true;
  }
}