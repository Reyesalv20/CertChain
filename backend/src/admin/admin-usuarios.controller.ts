// backend/src/admin/admin-usuarios.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/usuarios')
export class AdminUsuariosController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  listar() {
    return this.admin.listarUsuarios();
  }

  @Post()
  crear(
    @Body() body: { email: string; password: string; nombre: string; rol: string; institucionId?: number | null },
  ) {
    return this.admin.crearUsuario(body);
  }

  @Patch(':usuarioId')
  actualizar(
    @Param('usuarioId') usuarioId: string,
    @Body() body: { nombre?: string; email?: string; password?: string; rol?: string; institucionId?: number | null },
  ) {
    return this.admin.actualizarUsuario(usuarioId, body);
  }

  @Delete(':usuarioId')
  eliminar(@Param('usuarioId') usuarioId: string) {
    return this.admin.eliminarUsuario(usuarioId);
  }
}
