// backend/src/auth/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Uso: @Roles('admin') o @Roles('admin', 'institucional')
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
