import { BadGatewayException, Injectable, BadRequestException } from '@nestjs/common';

export interface ChatContexto {
  modo?: 'codigo' | 'hash' | 'tarjeta' | null;
  query?: string | null;
  estado?: 'idle' | 'valid' | 'invalid' | 'revoked' | 'error' | 'unknown' | null;
  certificado?: Record<string, unknown> | null;
  onChain?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface ChatRequestDto {
  mensaje?: string;
  pregunta?: string;
  codigoCertificado?: string;
  pagina?: 'landing' | 'verificacion' | string;
  contexto?: ChatContexto | null;
  historial?: Array<{ rol?: 'usuario' | 'bot'; mensaje?: string; texto?: string }>;
}

@Injectable()
export class ChatService {
  private readonly llmServiceUrl = process.env.LLM_SERVICE_URL ?? 'http://localhost:5000';

  async responder(payload: ChatRequestDto) {
    const mensaje = (payload.mensaje ?? payload.pregunta ?? '').trim();
    if (!mensaje) {
      throw new BadRequestException('La pregunta del usuario es obligatoria.');
    }

    const pagina = payload.pagina ?? 'verificacion';
    const contexto = this.normalizarContexto(payload, pagina);
    const historial = Array.isArray(payload.historial) ? payload.historial : [];

    const respuesta = await fetch(`${this.llmServiceUrl}/chat/mistral`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensaje,
        pagina,
        contexto,
        historial,
        instrucciones: this.instrucciones(pagina, contexto),
      }),
    });

    if (!respuesta.ok) {
      const detalle = await this.leerError(respuesta);
      throw new BadGatewayException(`No se pudo consultar el asistente IA: ${detalle}`);
    }

    const body = await respuesta.json();
    return {
      respuesta: body?.respuesta ?? 'No pude generar una respuesta en este momento.',
      modelo: body?.modelo ?? 'mistral',
      estado: body?.estado ?? 'ok',
    };
  }

  private normalizarContexto(payload: ChatRequestDto, pagina: string): ChatContexto | null {
    const contexto = payload.contexto ?? null;

    if (contexto) {
      return contexto;
    }

    if (payload.codigoCertificado) {
      return {
        modo: 'codigo',
        query: payload.codigoCertificado,
        estado: 'unknown',
        certificado: {
          codigo: payload.codigoCertificado,
        },
      };
    }

    if (pagina === 'landing') {
      return {
        modo: null,
        query: null,
        estado: 'idle',
        certificado: null,
      };
    }

    return null;
  }

  private instrucciones(pagina: string, contexto: ChatContexto | null) {
    const base = [
      'Responde solo con la información disponible en el contexto verificado.',
      'No inventes datos ni certidifcados que no estén presentes.',
      'Si no hay certificado cargado, guía al usuario a buscar uno primero.',
    ];

    if (pagina === 'landing') {
      return [
        ...base,
        'Explica de forma general cómo verificar un certificado por código, hash o tarjeta RFID.',
      ];
    }

    return [
      ...base,
      'Si el certificado está revocado o no existe, dilo claramente y explica qué significa.',
      'Si el contexto ya muestra un resultado de verificación, usa ese resultado como verdad y no vuelvas a buscarlo.',
    ];
  }

  private async leerError(response: Response) {
    try {
      const body = await response.json();
      return body?.detail ?? body?.message ?? `HTTP ${response.status}`;
    } catch {
      return `HTTP ${response.status}`;
    }
  }
}
