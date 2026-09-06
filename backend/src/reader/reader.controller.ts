// backend/src/reader/reader.controller.ts
import { BadRequestException, Body, Controller, Post, Query, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ReaderService } from './reader.service';
import { normalizarUid } from './uid.util';

// Canal del lector RFID:
//   POST /reader/uid   -> el ESP informa el UID leído (público, kiosko).
//   GET  /reader/events -> SSE: los clientes web reciben cada UID.
@Controller('reader')
export class ReaderController {
  constructor(private readonly reader: ReaderService) {}

  @Post('uid')
  uid(@Body() body: { uid?: string }, @Query('uid') qUid?: string) {
    const uid = normalizarUid(body?.uid ?? qUid);
    if (!uid) throw new BadRequestException('UID inválido: debe ser hexadecimal.');
    this.reader.emitirUid(uid);
    return { ok: true, uid };
  }

  @Sse('events')
  eventos(): Observable<{ data: string }> {
    return this.reader.suscribir().asObservable();
  }
}
