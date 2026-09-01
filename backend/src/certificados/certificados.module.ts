// backend/src/certificados/certificados.module.ts
import { Module } from '@nestjs/common';
import { CertificadosController } from './certificados.controller';
import { CertificadosService } from './certificados.service';
import { SubidaCacheService } from './subida-cache.service';
import { OcrService } from './ocr.service';

@Module({
  controllers: [CertificadosController],
  providers: [CertificadosService, SubidaCacheService, OcrService],
})
export class CertificadosModule {}