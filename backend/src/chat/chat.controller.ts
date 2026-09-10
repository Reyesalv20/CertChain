import { Body, Controller, Get, Post } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('sugerencias')
  sugerencias() {
    return {
      landing: [
        '¿Cómo puedo verificar mi tarjeta?',
        '¿Cómo funciona la tecnología?',
        '¿Puedo verificar mi certificado sin registro?',
      ],
      verificacion: [
        '¿Qué significa este certificado?',
        '¿Cómo puedo verificarlo?',
        '¿Qué ocurre si está revocado?',
        'No he buscado un certificado todavía, ¿qué hago?',
      ],
    };
  }

  @Post()
  async responder(@Body() body: any) {
    return this.chatService.responder({
      mensaje: body?.mensaje ?? body?.pregunta,
      pregunta: body?.pregunta,
      codigoCertificado: body?.codigoCertificado,
      pagina: body?.pagina ?? 'verificacion',
      contexto: body?.contexto ?? null,
      historial: body?.historial ?? [],
    });
  }
}
