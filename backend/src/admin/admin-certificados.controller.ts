// backend/src/admin/admin-certificados.controller.ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/certificados')
export class AdminCertificadosController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  listar(
    @Query('institucion_id') institucionId?: string,
    @Query('estado') estado?: string,
    @Query('q') q?: string,
  ) {
    return this.admin.listarCertificadosAdmin({
      institucionId: institucionId ? Number(institucionId) : undefined,
      estado,
      q,
    });
  }

  // Edita la metadata off-chain de un certificado (nombre estudiante, carrera, fecha).
  @Patch(':certId')
  editar(
    @Param('certId', ParseIntPipe) certId: number,
    @Body() body: { nombreEstudiante?: string; carrera?: string; fechaEmision?: string },
  ) {
    return this.admin.actualizarCertificado(certId, body);
  }

  // Vincula una tarjeta (credencial física) a un certificado por su UID.
  @Post(':certId/credenciales')
  vincular(@Param('certId', ParseIntPipe) certId: number, @Body() body: { uid: string }) {
    return this.admin.vincularCredencial(certId, body.uid);
  }

  @Delete(':certId/credenciales/:credencialId')
  desvincular(
    @Param('certId', ParseIntPipe) certId: number,
    @Param('credencialId', ParseIntPipe) credencialId: number,
  ) {
    return this.admin.desvincularCredencial(certId, credencialId);
  }
}
