import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'backend',
      // Confirma que las variables de entorno de comunicación entre servicios llegaron bien
      dependencies: {
        llmService: process.env.LLM_SERVICE_URL,
        blockchainService: process.env.BLOCKCHAIN_SERVICE_URL,
      },
    };
  }
}
