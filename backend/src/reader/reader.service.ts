// backend/src/reader/reader.service.ts
import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

// Difunde UIDs recibidos de un lector RFID (POST /reader/uid) hacia los
// clientes web suscritos por SSE (GET /reader/events).
@Injectable()
export class ReaderService {
  private readonly eventos = new Subject<{ data: string }>();

  emitirUid(uid: string): void {
    this.eventos.next({ data: JSON.stringify({ uid }) });
  }

  suscribir(): Subject<{ data: string }> {
    return this.eventos;
  }
}
