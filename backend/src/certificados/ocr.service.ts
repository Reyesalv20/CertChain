import { Injectable, Logger } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';

export interface DatosExtraidos {
  nombreEstudiante: string;
  carrera: string;
  fechaEmision: string; // formato YYYY-MM-DD, o '' si no se detectó
}

const MESES: Record<string, string> = {
  jan: '01', ene: '01',
  feb: '02',
  mar: '03',
  apr: '04', abr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08', ago: '08',
  sep: '09', sept: '09',
  oct: '10',
  nov: '11',
  dec: '12', dic: '12',
};

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  async extraerTexto(pdfBuffer: Buffer): Promise<string> {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
    const pdf = await loadingTask.promise;

    let textoCompleto = '';
    const totalPaginas = Math.min(pdf.numPages, 2);

    const worker = await createWorker('spa+eng'); // certificados a veces vienen en inglés (ej. Coursera)
    try {
      for (let i = 1; i <= totalPaginas; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = createCanvas(viewport.width, viewport.height);

        await page.render({
          canvas: canvas as any,
          viewport: viewport as any,
        }).promise;

        const imagenBuffer = canvas.toBuffer('image/png');
        const { data } = await worker.recognize(imagenBuffer);
        textoCompleto += data.text + '\n';
      }
    } finally {
      await worker.terminate();
    }

    this.logger.debug(`Texto OCR extraído:\n${textoCompleto}`);
    return textoCompleto;
  }

  parsearCampos(texto: string): DatosExtraidos {
    const lineas = texto
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const fechaEmision = this.extraerFecha(lineas);
    const indiceFecha = this.indiceDeLineaConFecha(lineas);
    const indiceCompletado = lineas.findIndex((l) =>
      /has\s+successfully\s+completed|completó\s+satisfactoriamente|certifica\s+que/i.test(l),
    );

    const nombreEstudiante = this.extraerNombre(lineas, indiceFecha, indiceCompletado);
    const carrera = this.extraerCarrera(lineas, indiceCompletado);

    return { nombreEstudiante, carrera, fechaEmision };
  }

  private indiceDeLineaConFecha(lineas: string[]): number {
    const regex = /([A-Za-zÁÉÍÓÚñ]{3,10})\.?\s*(\d{1,2}),?\s+(\d{4})/;
    return lineas.findIndex((l) => regex.test(l));
  }

  private extraerFecha(lineas: string[]): string {
    // Formato "Mes Día, Año" (ej. "Dec 9, 2023") — tolera espacios extra por OCR ruidoso.
    const regexTexto = /([A-Za-zÁÉÍÓÚñ]{3,10})\.?\s*(\d{1,2}),?\s+(\d{4})/;
    // Formato numérico como respaldo: 09/12/2023 o 2023-12-09
    const regexNumerica = /(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})\/(\d{1,2})\/(\d{4})/;

    for (const linea of lineas) {
      const m = linea.match(regexTexto);
      if (m) {
        const mesTexto = m[1].toLowerCase().replace(/\s/g, '').slice(0, 3);
        const mesNum = MESES[mesTexto];
        if (mesNum) {
          const dia = m[2].padStart(2, '0');
          return `${m[3]}-${mesNum}-${dia}`;
        }
      }
    }

    for (const linea of lineas) {
      const m = linea.match(regexNumerica);
      if (m) {
        if (m[1]) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
        if (m[6]) return `${m[6]}-${m[5].padStart(2, '0')}-${m[4].padStart(2, '0')}`;
      }
    }

    return '';
  }

  private extraerNombre(lineas: string[], indiceFecha: number, indiceCompletado: number): string {
    if (indiceFecha < 0) return '';

    for (let i = indiceFecha + 1; i < lineas.length; i++) {
      if (i === indiceCompletado) continue;
      if (/has\s+successfully\s+completed/i.test(lineas[i])) continue;
      // Evita capturar líneas que claramente no son un nombre de persona
      if (lineas[i].length > 60) continue;
      return lineas[i];
    }
    return '';
  }

  private extraerCarrera(lineas: string[], indiceCompletado: number): string {
    if (indiceCompletado < 0) return '';

    for (let i = indiceCompletado + 1; i < lineas.length; i++) {
      const linea = lineas[i];
      if (!linea) continue;
      // Salta la línea descriptiva larga tipo "an online non-credit course authorized by..."
      if (/^an?\s.*course/i.test(linea)) continue;
      if (/authorized by|offered through/i.test(linea)) continue;
      return linea;
    }
    return '';
  }
}