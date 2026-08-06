import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // GET /health -> usado por Docker/otros servicios para comprobar que el backend responde
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}
