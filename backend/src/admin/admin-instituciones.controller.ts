// backend/src/admin/admin-instituciones.controller.ts
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/instituciones')
export class AdminInstitucionesController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  listar() {
    return this.admin.listarInstituciones();
  }

  @Post()
  crear(@Body() body: { nombre: string }) {
    return this.admin.crearInstitucion(body.nombre);
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.admin.detalleInstitucion(id);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.admin.eliminarInstitucion(id);
  }

  @Get(':id/wallets')
  wallets(@Param('id', ParseIntPipe) id: number) {
    return this.admin.listarWalletsInstitucion(id);
  }

  @Post(':id/wallets')
  agregarWallet(@Param('id', ParseIntPipe) id: number, @Body() body: { address: string; etiqueta?: string }) {
    return this.admin.agregarWalletInstitucion(id, body);
  }

  @Delete(':id/wallets/:walletId')
  eliminarWallet(@Param('id', ParseIntPipe) id: number, @Param('walletId', ParseIntPipe) walletId: number) {
    return this.admin.eliminarWalletInstitucion(id, walletId);
  }

  @Get(':id/usuarios')
  usuarios(@Param('id', ParseIntPipe) id: number) {
    return this.admin.listarUsuarios(id);
  }
}
