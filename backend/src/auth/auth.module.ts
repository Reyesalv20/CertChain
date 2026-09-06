// backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';

// Los guards se importan por clase donde se usan; este módulo solo registra
// el controlador de /auth/me.
@Module({
  controllers: [AuthController],
})
export class AuthModule {}
