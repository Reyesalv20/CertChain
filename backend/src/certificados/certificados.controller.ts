// backend/src/certificados/certificados.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CertificadosService } from './certificados.service';

@Controller('certificados')
export class CertificadosController {
  constructor(private readonly certificados: CertificadosService) {}

  //Retirados debido a que la nueva forma de subir el pdf ya no utiliza estas dos funciones,
  //Ahora usa 'procesar' y 'confirmar'.
  /*
  @UseGuards(SupabaseAuthGuard)
  @Post('subir')
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }))
  async subir(@UploadedFile() archivo: Express.Multer.File, @Req() req: any) {
    return this.certificados.subir(archivo.buffer, archivo.originalname, req.institucion.institucion_id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post()
  async registrar(
    @Body() body: { subidaId: string; nombreEstudiante: string; carrera: string; fechaEmision: string },
    @Req() req: any,
  ) {
    return this.certificados.registrar(
      body.subidaId,
      body.nombreEstudiante,
      body.carrera,
      body.fechaEmision,
      req.institucion,
    );
  }*/
  
  @UseGuards(SupabaseAuthGuard)
  @Post('procesar')
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }))
  async procesar(@UploadedFile() archivo: Express.Multer.File, @Req() req: any) {
    return this.certificados.procesar(archivo.buffer, archivo.originalname, req.institucion.institucion_id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post('confirmar')
  async confirmar(@Body() body: any, @Req() req: any) {
    return this.certificados.confirmar(body, req.institucion);
  }


  @UseGuards(SupabaseAuthGuard)
  @Get('recientes')
  async recientes(@Req() req: any) {
    return this.certificados.recientes(req.institucion.institucion_id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Get('estadisticas')
  async estadisticas(@Req() req: any) {
    return this.certificados.estadisticas(req.institucion.institucion_id);
  }

  @Get('verificar')
  async verificar(@Query('codigo') codigo: string) {
    return this.certificados.verificar(codigo);
  }

  @Get('obtenerMetadataPorHash')
async obtenerMetadataPorHash(@Query('codigo') codigo?: string, @Query('hash') hash?: string) {
  return this.certificados.obtenerMetadataPorHash({ codigo, hash });
}
}