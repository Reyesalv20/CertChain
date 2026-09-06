// backend/src/auth/roles.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

// Se usa junto a SupabaseAuthGuard y @Roles(...). Exige que request.usuario.rol
// esté entre los roles permitidos.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const rol: string | null = request.usuario?.rol;

    if (!rol || !roles.includes(rol)) {
      throw new ForbiddenException('No tenés permisos para esta acción.');
    }
    return true;
  }
}
