# Lector RFID (ESP32) — ejemplo

Sketch de referencia para el ESP32 + lector **RC522** y pantalla **OLED 0.96" (I2C)**.
Un solo ESP con dos modos, alternando con un botón:

- **MODE VERIFICAR (kiosko)**: al acercar una credencial consulta al backend
  `GET /lector/tarjeta/<UID>` (que ya valida cada certificado on-chain) y muestra
  el resultado en la pantalla.
- **MODE VINCULAR**: al acercar una credencial envía el UID al backend
  (`POST /reader/uid`) para que las páginas web lo capturen (alta de credencial,
  detalle y /verificar).

> No usar `localhost` como host del backend: el ESP no es el equipo donde corre
> el backend. Usá la **IP LAN** de esa máquina (backend escucha en `0.0.0.0`).

## Librerías (Arduino IDE)
- `MFRC522` (miguelbalboa) — lector RC522
- `U8g2` (olikraus) — OLED
- `ArduinoJson` (bblanchon) — parseo de respuestas
- `WiFi`, `HTTPClient`, `SPI`, `Wire` (propias de ESP32)

## Configuración (arriba del archivo `.ino`)
| Constante | Qué es |
|---|---|
| `WIFI_SSID` / `WIFI_PASS` | red WiFi |
| `BACKEND_HOST` | IP LAN del equipo con el backend (ej. `192.168.1.50`) |
| `BACKEND_PORT` | `4000` |
| `SS_PIN` / `RST_PIN` | pines del RC522 (SPI: SCK/MOSI/MISO según placa) |
| `OLED_SDA` / `OLED_SCL` | I2C del display |

## Modo VERIFICAR — respuesta que parsea el sketch
`GET /lector/tarjeta/<UID>` devuelve:

```json
{
  "valido": true,
  "credencial": { "uid": "04A224B2", "codigo": null },
  "cantidad": 1,
  "certificados": [
    {
      "nombreEstudiante": "María Pérez",
      "carrera": "Ing. en Sistemas",
      "codigo": "UAX-2024-0847-MENG",
      "institucion": "Universidad X",
      "estado": "registrado",
      "hash": "0x...",
      "onChain": { "exists": true, "isRevoked": false, "valid": true, "issuer": "0x..." }
    }
  ]
}
```

- `onChain: null` → no se pudo validar en la cadena (blockchain-service caído).
- `valido: false` → no existe credencial con ese UID.

## Modo VINCULAR — UID que envía el sketch
`POST /reader/uid` con body JSON `{"uid":"04A224B2"}`. El UID se envía en
mayúsculas, sin `0x`, espacios ni separadores (formato canónico de
`credenciales_fisicas.uid_rfid`).
