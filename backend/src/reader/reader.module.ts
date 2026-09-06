// backend/src/reader/reader.module.ts
import { Module } from '@nestjs/common';
import { CertificadosModule } from '../certificados/certificados.module';
import { ReaderService } from './reader.service';
import { ReaderController } from './reader.controller';
import { LectorService } from './lector.service';
import { LectorController } from './lector.controller';

@Module({
  imports: [CertificadosModule],
  controllers: [ReaderController, LectorController],
  providers: [ReaderService, LectorService],
})
export class ReaderModule {}
