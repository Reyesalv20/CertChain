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
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { ReaderModule } from './reader/reader.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [SupabaseModule, CertificadosModule, AuthModule, AdminModule, ReaderModule, ChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}