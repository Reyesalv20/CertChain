#!/usr/bin/env python3
"""
Script para extraer coordenadas de texto en un PDF y devolver JSON.
Uso: python extract_pdf_coordinates.py <ruta_del_pdf> --json-output <archivo_salida.json>
"""

import sys
import pdfplumber
import json
from pathlib import Path
from typing import Optional

def extraer_coordenadas_json(pdf_path: str, output_file: str):
    """Extrae coordenadas y guarda como JSON."""
    
    pdf_path = Path(pdf_path)
    
    if not pdf_path.exists():
        print(f"Error: El archivo '{pdf_path}' no existe.", file=sys.stderr)
        sys.exit(1)
    
    lineas_json = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            page = pdf.pages[0]
            
            text_objects = page.extract_text_lines()
            
            if not text_objects:
                # Si no hay líneas, devuelve JSON vacío
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump([], f, ensure_ascii=False, indent=2)
                return
            
            for i, obj in enumerate(text_objects, 1):
                texto = obj['text'].strip()
                x0 = obj['x0']
                top = obj['top']
                x1 = obj['x1']
                bottom = obj['bottom']
                
                ancho = x1 - x0
                alto = bottom - top
                pct_top = (top / page.height) * 100
                
                if pct_top < 33:
                    region = "TOP"
                elif pct_top > 66:
                    region = "BOTTOM"
                else:
                    region = "MIDDLE"
                
                # Calcula posición vertical como porcentaje desde ARRIBA
                posicion_desde_arriba = ((page.height - top) / page.height) * 100
                
                lineas_json.append({
                    "texto": texto,
                    "x0": round(x0, 1),
                    "top": round(top, 1),
                    "x1": round(x1, 1),
                    "bottom": round(bottom, 1),
                    "region": region,
                    "posicionVertical": round(posicion_desde_arriba, 1)
                })
        
        # Guarda JSON con encoding UTF-8
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(lineas_json, f, ensure_ascii=False, indent=2)
        
    except Exception as e:
        print(f"Error al procesar PDF: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print("Uso: python extract_pdf_coordinates.py <ruta_del_pdf> --json-output <archivo_salida.json>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_file = None
    
    if len(sys.argv) > 2 and sys.argv[2] == '--json-output' and len(sys.argv) > 3:
        output_file = sys.argv[3]
    else:
        print("Error: Se requiere --json-output <archivo_salida.json>", file=sys.stderr)
        sys.exit(1)
    
    extraer_coordenadas_json(pdf_path, output_file)

if __name__ == '__main__':
    main()