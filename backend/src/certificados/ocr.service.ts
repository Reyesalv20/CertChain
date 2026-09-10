// backend/src/certificados/ocr.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface DatosExtraidos {
  nombreEstudiante: string;
  carrera: string;
  fechaEmision: string;
}

interface LineasConCoordenadas {
  texto: string;
  x0: number;
  top: number;
  x1: number;
  bottom: number;
  region: 'TOP' | 'MIDDLE' | 'BOTTOM';
  posicionVertical: number;
}

interface ConfiguracionOCR {
  nombreRegion: 'TOP' | 'MIDDLE' | 'BOTTOM';
  carreraRegion: 'TOP' | 'MIDDLE' | 'BOTTOM';
  fechaRegion: 'TOP' | 'MIDDLE' | 'BOTTOM';
  nombreRegex: RegExp;
  carreraRegex: RegExp;
  fechaRegex: RegExp;
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

// CONFIGURACIONES POR INSTITUCIÓN (todo hardcodeado)
const CONFIGURACIONES_POR_INSTITUCION: Record<number, ConfiguracionOCR> = {
  // Cisco
  /*3: {
    nombreRegion: 'MIDDLE',
    carreraRegion: 'MIDDLE',
    fechaRegion: 'BOTTOM',
    nombreRegex: /^(([A-ZÁÉÍÓÚÑ]){4,80}([\s])){4}$/,
    carreraRegex: /^([A-ZÁÉÍÓÚÑa-záéíóúñ\s:]{4,80})$/,
    fechaRegex: /([0-9]){2}\s([A-Za-z]{1,3})\s([0-9]){4}/,
  },*/
  // Cisco Academy (institución 3)
3: {
  nombreRegion: 'TOP',
  carreraRegion: 'MIDDLE',
  fechaRegion: 'BOTTOM',
  // Nombre: captura cualquier línea en TOP que sea solo letras y espacios (mayúsculas)
  nombreRegex: /^([A-ZÁÉÍÓÚÑ\s]+)$/,
  // Carrera: captura línea que contenga "CCNA" o similar (con números, dos puntos, letras)
  carreraRegex: /^([A-Z0-9Á-Ú:a-záéíóúñ\s]+)$/,
  // Fecha: "18 Aug 2026" formato específico
  fechaRegex: /(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/,
},
  
  // UNITEC (Cisco Academy)
  1: {
    nombreRegion: 'TOP',
    carreraRegion: 'MIDDLE',
    fechaRegion: 'BOTTOM',
    nombreRegex: /^([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s]{4,80})$/,
    carreraRegex: /(?:completó\s+(?:con\s+éxito\s+)?)?([A-ZÁÉÍÓÚÑa-záéíóúñ\s:]+)/,
    fechaRegex: /(\d{1,2})\s+([A-Za-z]{3,10})\s+(\d{4})/,
  },

  // Universidad Nacional Autónoma
  2: {
    nombreRegion: 'TOP',
    carreraRegion: 'MIDDLE',
    fechaRegion: 'BOTTOM',
    nombreRegex: /^([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s]{4,80})$/,
    carreraRegex: /(?:Carrera|Programa)[:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s:]+)/i,
    fechaRegex: /(\d{1,2})\s+de\s+([A-Za-z]+)\s+de\s+(\d{4})/,
  },

  // Instituto Tecnológico Superior
  4: {
    nombreRegion: 'TOP',
    carreraRegion: 'MIDDLE',
    fechaRegion: 'BOTTOM',
    nombreRegex: /^([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s]{4,80})$/,
    carreraRegex: /(?:Carrera|Programa)[:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s:]+)/i,
    fechaRegex: /(\d{1,2})\s+de\s+([A-Za-z]+)\s+de\s+(\d{4})/,
  },

  // Universidad Católica del Norte
  5: {
    nombreRegion: 'TOP',
    carreraRegion: 'MIDDLE',
    fechaRegion: 'BOTTOM',
    nombreRegex: /^([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s]{4,80})$/,
    carreraRegex: /(?:Carrera|Programa)[:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\s:]+)/i,
    fechaRegex: /(\d{1,2})\s+de\s+([A-Za-z]+)\s+de\s+(\d{4})/,
  },
};

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  /**
   * Obtiene la configuración OCR para una institución.
   * Si no existe, devuelve la configuración por defecto (Arizona State University).
   */
  private obtenerConfiguracion(institucionId: number): ConfiguracionOCR {
    return CONFIGURACIONES_POR_INSTITUCION[institucionId] || CONFIGURACIONES_POR_INSTITUCION[4];
  }

  /**
   * Extrae texto directamente del PDF con coordenadas.
   */
async extraerTextoConCoordenadas(pdfBuffer: Buffer): Promise<LineasConCoordenadas[]> {
  const fs = require('fs');
  const path = require('path');
  const { execSync } = require('child_process');
  const os = require('os');

  const tmpPdfPath = path.join(os.tmpdir(), `temp_${Date.now()}.pdf`);
  const tmpOutputPath = path.join(os.tmpdir(), `output_${Date.now()}.json`);

  try {
    fs.writeFileSync(tmpPdfPath, pdfBuffer);

    const scriptPath = path.join(__dirname, '../../extract_pdf_coordinates.py');
    const comando = `python3 "${scriptPath}" "${tmpPdfPath}" --json-output "${tmpOutputPath}"`;
    
    try {
      execSync(comando, { stdio: 'pipe', encoding: 'utf-8' });
    } catch (e: any) {
      this.logger.error(`Error ejecutando Python: ${e.message}`);
      throw new Error('No se pudo procesar el PDF con el script Python');
    }

    // Lee y parsea el JSON
    const output = fs.readFileSync(tmpOutputPath, 'utf-8');
    const lineas: LineasConCoordenadas[] = JSON.parse(output);

    this.logger.debug(
      `Extracción con Python (${lineas.length} líneas):\n${lineas
        .map((l) => `${l.region} (${l.posicionVertical}%): "${l.texto}"`)
        .join('\n')}`,
    );

    return lineas;
  } finally {
    if (fs.existsSync(tmpPdfPath)) fs.unlinkSync(tmpPdfPath);
    if (fs.existsSync(tmpOutputPath)) fs.unlinkSync(tmpOutputPath);
  }
}

/**
 * Busca una línea que contenga un patrón y devuelve la SIGUIENTE línea.
 * Útil para campos que vienen después de una línea clave.
 */
private extraerProximaLineaAfter(
  lineas: LineasConCoordenadas[],
  region: string,
  patronBuscar: RegExp,
): string {
  const lineasEnRegion = lineas.filter((l) => l.region === region);

  for (let i = 0; i < lineasEnRegion.length - 1; i++) {
    if (patronBuscar.test(lineasEnRegion[i].texto)) {
      // Encontró la línea con el patrón, devuelve la siguiente
      return lineasEnRegion[i + 1].texto.trim();
    }
  }

  return '';
}

  /**
   * Parsea campos usando coordenadas y regiones.
   * Este es el método principal usado por el servicio de certificados.
   */

async parsearCamposConRegiones(
  pdfBuffer: Buffer,
  institucionId: number,
): Promise<DatosExtraidos> {
  const config = this.obtenerConfiguracion(institucionId);
  const lineas = await this.extraerTextoConCoordenadas(pdfBuffer);

  // Nombre: busca en región TOP con regex
  const nombreEstudiante = this.extraerPorRegion(lineas, config.nombreRegion, config.nombreRegex);
  
  // Carrera: busca la línea que viene DESPUÉS de "por completar"
  const patronCompletado = /por\s+completar/i;
  const carrera = this.extraerProximaLineaAfter(lineas, config.carreraRegion, patronCompletado);
  
  // Fecha: busca en región BOTTOM con regex
  const fechaEmision = this.extraerFechaEnRegion(lineas, config.fechaRegion, config.fechaRegex);

  this.logger.debug(
    `Campos extraídos (institución ${institucionId}): nombre="${nombreEstudiante}", carrera="${carrera}", fecha="${fechaEmision}"`,
  );

  return { nombreEstudiante, carrera, fechaEmision };
}
  /**
   * Busca una línea en una región específica y extrae con regex.
   */
  private extraerPorRegion(
    lineas: LineasConCoordenadas[],
    region: string,
    regex: RegExp,
  ): string {
    const lineasEnRegion = lineas.filter((l) => l.region === region);

    for (const linea of lineasEnRegion) {
      const m = linea.texto.match(regex);
      if (m) {
        return (m[1] || linea.texto).trim();
      }
    }

    return '';
  }

  /**
   * Extrae fecha en una región específica, formateando según el patrón detectado.
   */
  private extraerFechaEnRegion(
    lineas: LineasConCoordenadas[],
    region: string,
    regex: RegExp,
  ): string {
    const lineasEnRegion = lineas.filter((l) => l.region === region);

    for (const linea of lineasEnRegion) {
      const m = linea.texto.match(regex);
      if (m) {
        // Intenta formatear como "Dec 9, 2023" (grupo 1 es mes, grupo 2 es día, grupo 3 es año)
        if (m[1] && m[2] && m[3]) {
          const mesTexto = m[1].toLowerCase().replace(/\s/g, '').slice(0, 3);
          const mesNum = MESES[mesTexto];
          if (mesNum) {
            return `${m[3]}-${mesNum}-${m[2].padStart(2, '0')}`;
          }
        }

        // Intenta formatear como "18 de agosto de 2026" (grupo 1 es día, grupo 2 es mes, grupo 3 es año)
        if (m[1] && m[2] && m[3]) {
          const mesTexto = m[2].toLowerCase().slice(0, 3);
          const mesNum = MESES[mesTexto];
          if (mesNum) {
            return `${m[3]}-${mesNum}-${m[1].padStart(2, '0')}`;
          }
        }
      }
    }

    return '';
  }
}