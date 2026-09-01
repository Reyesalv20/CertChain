/*import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

*/

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { CertificadosModule } from './certificados/certificados.module';

@Module({
  imports: [SupabaseModule, CertificadosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}