// backend/src/reader/lector.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { LectorService } from './lector.service';

// Endpoint para el kiosko del ESP32: GET /lector/tarjeta/:uid
@Controller('lector')
export class LectorController {
  constructor(private readonly lector: LectorService) {}

  @Get('tarjeta/:uid')
  tarjeta(@Param('uid') uid: string) {
    return this.lector.tarjeta(uid);
  }
}
