// backend/src/admin/admin-credenciales.controller.ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/credenciales')
export class AdminCredencialesController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  listar() {
    return this.admin.listarCredenciales();
  }

  @Post()
  crear(@Body() body: { uidRfid: string; codigo?: string; fechaEmisionFisica?: string }) {
    return this.admin.crearCredencial(body);
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.admin.detalleCredencial(id);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { uidRfid?: string; codigo?: string; fechaEmisionFisica?: string },
  ) {
    return this.admin.actualizarCredencial(id, body);
  }

  // Vincula un certificado existente a la credencial.
  @Post(':id/certificados')
  vincularCertificado(@Param('id', ParseIntPipe) id: number, @Body() body: { certificadoId: number }) {
    return this.admin.vincularCertificadoAcredencial(id, body.certificadoId);
  }

  @Delete(':id/certificados/:certificadoId')
  desvincularCertificado(
    @Param('id', ParseIntPipe) id: number,
    @Param('certificadoId', ParseIntPipe) certificadoId: number,
  ) {
    return this.admin.desvincularCertificadoDeCredencial(id, certificadoId);
  }
}
