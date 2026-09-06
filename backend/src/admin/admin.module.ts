// backend/src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminInstitucionesController } from './admin-instituciones.controller';
import { AdminCertificadosController } from './admin-certificados.controller';
import { AdminCredencialesController } from './admin-credenciales.controller';
import { AdminUsuariosController } from './admin-usuarios.controller';

@Module({
  controllers: [
    AdminInstitucionesController,
    AdminCertificadosController,
    AdminCredencialesController,
    AdminUsuariosController,
  ],
  providers: [AdminService],
})
export class AdminModule {}
