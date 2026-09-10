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
  private readonly llmTimeoutMs = Number(process.env.LLM_SERVICE_TIMEOUT ?? 60000);

  async responder(payload: ChatRequestDto) {
    const mensaje = (payload.mensaje ?? payload.pregunta ?? '').trim();
    if (!mensaje) {
      throw new BadRequestException('La pregunta del usuario es obligatoria.');
    }

    const pagina = payload.pagina ?? 'verificacion';
    const contexto = this.normalizarContexto(payload, pagina);
    const historial = Array.isArray(payload.historial) ? payload.historial : [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.llmTimeoutMs);

    try {
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
        signal: controller.signal,
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
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadGatewayException(
          'El asistente IA tardó demasiado en responder. Intenta nuevamente en unos segundos.',
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    // unreachable keep after finally for readability

  }

  private normalizarContexto(payload: ChatRequestDto, pagina: string): ChatContexto | null {
    const contexto = payload.contexto ?? null;

    if (contexto) {
      return {
        ...contexto,
        modo: contexto.modo ?? null,
        query: contexto.query ?? payload.codigoCertificado ?? null,
        estado: contexto.estado ?? 'unknown',
        certificado: contexto.certificado ?? null,
        onChain: contexto.onChain ?? null,
      };
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
        onChain: null,
      };
    }

    return null;
  }

  private instrucciones(pagina: string, contexto: ChatContexto | null) {
    const base = [
      'Responde solo con la información verificada del contexto.',
      'No inventes nombres, fechas, carreras, instituciones ni estados.',
      'Mantén la respuesta en 1 a 3 frases.',
      'Si no hay suficiente información, pide solo una aclaración.',
    ];

    if (pagina === 'landing') {
      return [
        ...base,
        'Esta es una conversación de landing: responde con orientación general y no hables de certificados faltantes.',
        'Explica cómo verificar un certificado por código, hash o tarjeta RFID en una frase breve.',
      ];
    }

    return [
      ...base,
      'Si el certificado está revocado o no existe, dilo claramente.',
      'Si el contexto ya muestra un resultado verificado, úsalo como verdad y no vuelvas a buscarlo.',
      'Si el estado es válido, confirma la validación de forma breve y clara.',
      contexto && contexto.estado === 'valid' ? 'La validación actual es confirmada: responde afirmando esa validación sin agregar detalles fantasiosos.' : '',
    ].filter(Boolean);
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
