// backend/src/auth/auth.controller.ts
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Controller('auth')
export class AuthController {
  // GET /auth/me -> quién soy (usuario de plataforma + institución si tiene)
  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return { usuario: req.usuario, institucion: req.institucion ?? null };
  }
}
